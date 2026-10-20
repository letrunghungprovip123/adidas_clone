import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { InventoryDatabase } from './database';
import {
  InventoryError, assertIdentifier, assertPositiveInteger,
  type ReserveRequest, type ReservationItem, type ReserveResult,
  type ReservationStatus, type AvailabilityResult
} from './inventory.types';

type Row = { id: string; checkout_ref: string; status: ReservationStatus; expires_at: Date };
type StockRow = { variant_id: number; on_hand_qty: number; reserved_qty: number; status: 'ACTIVE'|'DISABLED' };
const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class InventoryService {
  constructor(private readonly db: InventoryDatabase) {}

  async availability(variantId: number): Promise<AvailabilityResult> {
    assertPositiveInteger(variantId, 'variant_id', 2147483647);
    const r = await this.db.query<StockRow>(
      'SELECT variant_id, on_hand_qty, reserved_qty, status FROM inventory_stock WHERE variant_id=$1', [variantId]);
    if (r.rows.length === 0) throw new InventoryError('NOT_FOUND', 'Unknown inventory variant');
    const s = r.rows[0];
    return { ...s, available_qty: s.status === 'ACTIVE' ? s.on_hand_qty - s.reserved_qty : 0 };
  }

  private normalized(request: ReserveRequest) {
    assertIdentifier(request.checkout_ref, 'checkout_ref');
    assertIdentifier(request.idempotency_key, 'idempotency_key');
    if (!Array.isArray(request.items) || request.items.length === 0 || request.items.length > 50)
      throw new InventoryError('VALIDATION_FAILED', 'items must contain 1-50 lines');
    const map = new Map<number, number>();
    for (const item of request.items) {
      if (!item || typeof item !== 'object') throw new InventoryError('VALIDATION_FAILED','Invalid item');
      assertPositiveInteger(item.variant_id, 'variant_id', 2147483647);
      assertPositiveInteger(item.quantity, 'quantity', 10000);
      const sum = (map.get(item.variant_id) || 0) + item.quantity;
      if (sum > 10000) throw new InventoryError('VALIDATION_FAILED', 'Maximum quantity per variant exceeded');
      map.set(item.variant_id, sum);
    }
    const ttl = request.ttl_seconds ?? 900;
    assertPositiveInteger(ttl, 'ttl_seconds', 1800);
    if (ttl < 60) throw new InventoryError('VALIDATION_FAILED','Minimum hold time is 60 seconds');
    const items = [...map.entries()].sort((a,b)=>a[0]-b[0])
      .map(([variant_id,quantity])=>({variant_id,quantity}));
    return { items, ttl, fingerprint: hashOf({items,ttl}) };
  }

  private async loadResult(client: PoolClient, header: Row): Promise<ReserveResult> {
    const r=await client.query<ReservationItem>(
      'SELECT variant_id, quantity FROM inventory_reservation_items WHERE reservation_id=$1 ORDER BY variant_id',
      [header.id]);
    return {id:header.id,checkout_ref:header.checkout_ref,status:header.status,
      expires_at:new Date(header.expires_at).toISOString(),items:r.rows};
  }
  private async recordMovement(client: PoolClient, variantId: number, reservationId: string|null,
    key: string, type: string, onHand: number, reserved: number) {
    await client.query(
      `INSERT INTO inventory_stock_movements
       (id,variant_id,reservation_id,operation_key,movement_type,delta_on_hand,delta_reserved)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [randomUUID(),variantId,reservationId,key,type,onHand,reserved]);
  }
  private async emit(client: PoolClient, topic: string, payload: Record<string,unknown>) {
    const message_id=randomUUID();
    const envelope={
      message_id, correlation_id: payload.reservation_id, occurred_at: new Date().toISOString(),
      contract_version:1, actor:{kind:'system'}, payload
    };
    await client.query('INSERT INTO inventory_outbox(id,topic,envelope) VALUES ($1,$2,$3)',
      [message_id,topic,JSON.stringify(envelope)]);
  }

  async reserve(input: ReserveRequest): Promise<ReserveResult> {
    if (!input || typeof input !== 'object') throw new InventoryError('VALIDATION_FAILED','Invalid reservation');
    const {items,ttl,fingerprint}=this.normalized(input);
    const id = randomUUID();
    return this.db.transaction(async client => {
      const inserted=await client.query<Row>(
        `INSERT INTO inventory_reservations (id,checkout_ref,idempotency_key,request_hash,status,expires_at)
         VALUES ($1,$2,$3,$4,'ACTIVE',clock_timestamp()+($5::integer * interval '1 second'))
         ON CONFLICT DO NOTHING RETURNING id,checkout_ref,status,expires_at`,
        [id,input.checkout_ref,input.idempotency_key,fingerprint,ttl]);
      if (inserted.rows.length === 0) {
        const prior = await client.query<Row & {request_hash:string;idempotency_key:string}>(
          `SELECT id, checkout_ref, idempotency_key, request_hash, status, expires_at
           FROM inventory_reservations WHERE checkout_ref=$1 OR idempotency_key=$2 FOR UPDATE`,
          [input.checkout_ref,input.idempotency_key]);
        const row=prior.rows[0];
        if (!row || row.checkout_ref!==input.checkout_ref ||
            row.idempotency_key!==input.idempotency_key || row.request_hash!==fingerprint)
          throw new InventoryError('IDEMPOTENCY_CONFLICT','Reservation key or checkout payload conflicts');
        await this.expireOneIfNeeded(client,row);
        const updated=await client.query<Row>(
          'SELECT id,checkout_ref,status,expires_at FROM inventory_reservations WHERE id=$1',[row.id]);
        return this.loadResult(client,updated.rows[0]);
      }
      for (const item of items) {
        const updated=await client.query<StockRow>(
          `UPDATE inventory_stock SET reserved_qty=reserved_qty+$2,
            version=version+1,updated_at=clock_timestamp()
            WHERE variant_id=$1 AND status='ACTIVE' AND on_hand_qty-reserved_qty >= $2
            RETURNING variant_id,on_hand_qty,reserved_qty,status`,
          [item.variant_id,item.quantity]);
        if(updated.rowCount!==1)
          throw new InventoryError('INSUFFICIENT_STOCK','Variant unavailable or stock insufficient: '+item.variant_id);
        await client.query(
          'INSERT INTO inventory_reservation_items(reservation_id,variant_id,quantity) VALUES($1,$2,$3)',
          [id,item.variant_id,item.quantity]);
        await this.recordMovement(client,item.variant_id,id,'reserve:'+id,'RESERVE',0,item.quantity);
      }
      await this.emit(client,'inventory.reserved.v1',{reservation_id:id,checkout_ref:input.checkout_ref,items});
      return this.loadResult(client,inserted.rows[0]);
    });
  }

  private async expireOneIfNeeded(client: PoolClient, row: Row): Promise<boolean> {
    if(row.status!=='ACTIVE') return false;
    const check=await client.query<{expired:boolean}>(
      'SELECT expires_at <= clock_timestamp() AS expired FROM inventory_reservations WHERE id=$1',
      [row.id]);
    if(!check.rows[0].expired) return false;
    await this.releaseItems(client,row,'EXPIRED');
    return true;
  }
  private async releaseItems(client: PoolClient,row:Row,final:'EXPIRED'|'RELEASED') {
    const items=await client.query<ReservationItem>(
      'SELECT variant_id,quantity FROM inventory_reservation_items WHERE reservation_id=$1 ORDER BY variant_id',[row.id]);
    for(const item of items.rows){
      const changed=await client.query(
        `UPDATE inventory_stock SET reserved_qty=reserved_qty-$2,version=version+1,
         updated_at=clock_timestamp() WHERE variant_id=$1 AND reserved_qty >= $2 RETURNING variant_id`,
        [item.variant_id,item.quantity]);
      if(changed.rowCount!==1) throw new Error('Inventory invariant broken: release');
      await this.recordMovement(client,item.variant_id,row.id,final.toLowerCase()+':'+row.id,
        final==='EXPIRED'?'EXPIRE':'RELEASE',0,-item.quantity);
    }
    await client.query(
      `UPDATE inventory_reservations SET status=$2, released_at=clock_timestamp() WHERE id=$1 AND status='ACTIVE'`,
      [row.id,final]);
    await this.emit(client,final==='EXPIRED'?'inventory.expired.v1':'inventory.released.v1',
      {reservation_id:row.id,checkout_ref:row.checkout_ref});
  }

  async changeReservation(id: string, action:'COMMITTED'|'RELEASED'):Promise<ReserveResult> {
    assertIdentifier(id,'reservation_id');
    return this.db.transaction(async client=>{
      const result=await client.query<Row>(
        'SELECT id,checkout_ref,status,expires_at FROM inventory_reservations WHERE id=$1 FOR UPDATE',[id]);
      if(!result.rows.length) throw new InventoryError('NOT_FOUND','Reservation not found');
      const row=result.rows[0];
      if(row.status===action) return this.loadResult(client,row);
      await this.expireOneIfNeeded(client,row);
      const current=await client.query<Row>(
        'SELECT id,checkout_ref,status,expires_at FROM inventory_reservations WHERE id=$1',[id]);
      if(current.rows[0].status!=='ACTIVE')
        throw new InventoryError('CONFLICT','Reservation already finalized as '+current.rows[0].status);
      if(action==='RELEASED') await this.releaseItems(client,row,'RELEASED');
      else {
        const items=await client.query<ReservationItem>(
          'SELECT variant_id,quantity FROM inventory_reservation_items WHERE reservation_id=$1 ORDER BY variant_id',[id]);
        for(const item of items.rows){
          const changed=await client.query(
            `UPDATE inventory_stock SET on_hand_qty=on_hand_qty-$2,
             reserved_qty=reserved_qty-$2,version=version+1,updated_at=clock_timestamp()
             WHERE variant_id=$1 AND reserved_qty >= $2 AND on_hand_qty >= $2 RETURNING variant_id`,
            [item.variant_id,item.quantity]);
          if(changed.rowCount!==1) throw new Error('Inventory invariant broken: commit');
          await this.recordMovement(client,item.variant_id,id,'commit:'+id,'COMMIT',-item.quantity,-item.quantity);
        }
        await client.query(
          `UPDATE inventory_reservations SET status='COMMITTED', committed_at=clock_timestamp()
           WHERE id=$1 AND status='ACTIVE'`,[id]);
        await this.emit(client,'inventory.committed.v1',{reservation_id:id,checkout_ref:row.checkout_ref});
      }
      const latest=await client.query<Row>(
        'SELECT id,checkout_ref,status,expires_at FROM inventory_reservations WHERE id=$1',[id]);
      return this.loadResult(client,latest.rows[0]);
    });
  }

  /** Adjustment is privileged/internal only. A negative delta may never undercut outstanding holds. */
  async adjustStock(variantId:number,delta:number,key:string,reason:string) {
    assertPositiveInteger(variantId,'variant_id',2147483647);
    assertIdentifier(key,'operation_key');
    if(!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>100000)
      throw new InventoryError('VALIDATION_FAILED','Invalid adjustment');
    if(typeof reason!=='string'||reason.trim().length<3||reason.length>250)
      throw new InventoryError('VALIDATION_FAILED','Reason is required');
    const requestHash=hashOf({variantId,delta,reason});
    return this.db.transaction(async client=>{
      const ins=await client.query(
        'INSERT INTO inventory_operations(operation_key,request_hash) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING operation_key',
        [key,requestHash]);
      if(!ins.rowCount){
        const prior=await client.query<{request_hash:string;result:AvailabilityResult}>(
          'SELECT request_hash,result FROM inventory_operations WHERE operation_key=$1 FOR UPDATE',[key]);
        if(prior.rows[0].request_hash!==requestHash)
          throw new InventoryError('IDEMPOTENCY_CONFLICT','Operation payload conflicts');
        return prior.rows[0].result;
      }
      const changed=await client.query<StockRow>(
        `UPDATE inventory_stock SET on_hand_qty=on_hand_qty+$2,version=version+1,
         updated_at=clock_timestamp()
         WHERE variant_id=$1 AND on_hand_qty+$2>=reserved_qty AND on_hand_qty+$2>=0
         AND status='ACTIVE'
         RETURNING variant_id,on_hand_qty,reserved_qty,status`,[variantId,delta]);
      if(changed.rowCount!==1) throw new InventoryError('CONFLICT','Adjustment would violate available stock or variant is disabled');
      const s=changed.rows[0];
      const result:AvailabilityResult={...s,available_qty:s.on_hand_qty-s.reserved_qty};
      await this.recordMovement(client,variantId,null,key,'ADJUST',delta,0);
      await client.query('UPDATE inventory_operations SET result=$2 WHERE operation_key=$1',
        [key,JSON.stringify(result)]);
      await this.emit(client,'inventory.adjusted.v1',{variant_id:variantId,delta,reason});
      return result;
    });
  }

  /** Expire one row per transaction to minimize lock hold time; multiple workers use SKIP LOCKED. */
  async expireBatch(limit=20):Promise<number> {
    assertPositiveInteger(limit,'limit',100);
    let expired=0;
    for(let i=0;i<limit;i++){
      const didExpire=await this.db.transaction(async client=>{
        const pending=await client.query<Row>(
          `SELECT id,checkout_ref,status,expires_at FROM inventory_reservations
           WHERE status='ACTIVE' AND expires_at<=clock_timestamp()
           ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT 1`);
        if(!pending.rows.length) return false;
        await this.releaseItems(client,pending.rows[0],'EXPIRED');
        return true;
      });
      if(!didExpire) break;
      expired++;
    }
    return expired;
  }
}
