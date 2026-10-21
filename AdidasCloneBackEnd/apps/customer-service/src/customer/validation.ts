export class CustomerError extends Error {
 constructor(readonly code:string,message:string){super(message);this.name='CustomerError'}
}
export function id(v:unknown,key='id'){
 if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1||v>2147483647)
  throw new CustomerError('VALIDATION_FAILED',key+' must be a positive integer');
 return v;
}
export function text(v:unknown,key:string,max=180){
 if(typeof v!=='string'||!v.trim()||v.length>max)
  throw new CustomerError('VALIDATION_FAILED',key+' invalid');
 return v.trim();
}
export function points(v:unknown){
 if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1||v>1000000000)
  throw new CustomerError('VALIDATION_FAILED','points invalid');
 return v;
}
export function fields(v:unknown,names:string[]):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v))throw new CustomerError('VALIDATION_FAILED','Expected object');
 const data=v as Record<string,unknown>;
 if(Object.keys(data).some(k=>!names.includes(k)))
  throw new CustomerError('VALIDATION_FAILED','Forbidden or unknown field');
 return data;
}
export function page(v:unknown,defaultValue:number,max:number){
 if(v===undefined)return defaultValue;
 const n=typeof v==='string'&&/^\d+$/.test(v)?Number(v):v;
 if(typeof n!=='number'||!Number.isSafeInteger(n)||n<1||n>max)
  throw new CustomerError('VALIDATION_FAILED','Invalid page or limit');
 return n;
}
