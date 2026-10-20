import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { COMMANDS } from '../../../../libs/contracts/src';
import { InventoryService } from './inventory.service';
import { InventoryError, type ReserveRequest } from './inventory.types';

type Envelope = {contract_version?: number; correlation_id?: string; payload?: unknown};
@Controller()
export class InventoryRmqController {
  private readonly log=new Logger(InventoryRmqController.name);
  constructor(private readonly inventory:InventoryService){}
  private async handle(context:RmqContext,input:unknown,callback:(payload:Record<string,unknown>)=>Promise<unknown>) {
    const channel=context.getChannelRef(),message=context.getMessage();
    try {
      const env=input as Envelope;
      if(!env || env.contract_version!==1 || !env.payload || typeof env.payload!=='object')
        throw new InventoryError('VALIDATION_FAILED','Expected v1 envelope with payload');
      const result=await callback(env.payload as Record<string,unknown>);
      channel.ack(message);
      return {ok:true, data:result, correlation_id:env.correlation_id??null};
    } catch(e) {
      if (e instanceof InventoryError) {
        channel.ack(message);
        return {ok:false,error:{code:e.code,message:e.message}};
      }
      this.log.error('transient inventory operation failed; dead lettering; retry with same idempotency key');
      channel.nack(message,false,false);
      // RPC sender may time out; sender must query/retry using same key.
      return {ok:false,error:{code:'DEPENDENCY_UNAVAILABLE',message:'Transient inventory failure'}};
    }
  }

  @MessagePattern({cmd:COMMANDS.inventoryReservationCreate})
  reserve(@Payload() env:unknown,@Ctx() context:RmqContext) {
    return this.handle(context,env,p=>this.inventory.reserve(p as ReserveRequest));
  }
  @MessagePattern({cmd:COMMANDS.inventoryReservationCommit})
  commit(@Payload() env:unknown,@Ctx() context:RmqContext) {
    return this.handle(context,env,p=>this.inventory.changeReservation(p.reservation_id as string,'COMMITTED'));
  }
  @MessagePattern({cmd:COMMANDS.inventoryReservationRelease})
  release(@Payload() env:unknown,@Ctx() context:RmqContext) {
    return this.handle(context,env,p=>this.inventory.changeReservation(p.reservation_id as string,'RELEASED'));
  }
  @MessagePattern({cmd:'inventory.availability.get.v1'})
  availability(@Payload() env:unknown,@Ctx() context:RmqContext) {
    return this.handle(context,env,p=>this.inventory.availability(p.variant_id as number));
  }
  @MessagePattern({cmd:'inventory.reservation.status.get.v1'})
  status(@Payload() env:unknown,@Ctx() context:RmqContext) {
    return this.handle(context,env,p=>this.inventory.status(p.reservation_id as string));
  }
}
