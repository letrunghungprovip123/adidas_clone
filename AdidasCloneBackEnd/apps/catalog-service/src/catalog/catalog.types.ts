export class CatalogError extends Error {
  constructor(readonly code:string,message:string){super(message);this.name='CatalogError';}
}
export function requiredText(v:unknown,name:string,max=255):string {
  if(typeof v!=='string'||!v.trim()||v.length>max)throw new CatalogError('VALIDATION_FAILED',name+' invalid');
  return v.trim();
}
export function positiveId(v:unknown,name='id'):number {
  if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1||v>2147483647)
    throw new CatalogError('VALIDATION_FAILED',name+' must be a positive integer');
  return v;
}
export function priceVnd(v:unknown):string {
  const str=typeof v==='number'&&Number.isFinite(v)?String(v):v;
  if(typeof str!=='string'||!/^\d{1,12}(?:\.\d{1,2})?$/.test(str))
    throw new CatalogError('VALIDATION_FAILED','Price must have at most two decimal places');
  const [whole,fraction='']=str.split('.');
  if(BigInt(whole)>100000000000n)
    throw new CatalogError('VALIDATION_FAILED','Price too large');
  return BigInt(whole).toString()+'.'+fraction.padEnd(2,'0');
}
export function safeSlug(v:unknown):string {
  const s=requiredText(v,'slug',255).toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))
    throw new CatalogError('VALIDATION_FAILED','Slug must use lowercase ASCII and hyphens');
  return s;
}
export function normalizeGender(v:unknown):'MEN'|'WOMEN'|'UNISEX' {
  const s=requiredText(v,'gender',30).normalize('NFC').toLowerCase();
  if(['men','male','nam'].includes(s))return 'MEN';
  if(['women','female','nữ','nu'].includes(s))return 'WOMEN';
  if(['unisex'].includes(s))return 'UNISEX';
  throw new CatalogError('VALIDATION_FAILED','Unsupported gender');
}
export function boundedPage(v:unknown,fallback:number,cap:number):number {
  if(v===undefined||v===null)return fallback;
  const n=typeof v==='string'&&/^\d+$/.test(v)?Number(v):v;
  if(typeof n!=='number'||!Number.isSafeInteger(n)||n<1||n>cap)
    throw new CatalogError('VALIDATION_FAILED','Invalid pagination value');
  return n;
}
export function normalizeAttributes(v:unknown):Record<string,unknown> {
  if(v===undefined||v===null)return {};
  if(typeof v!=='object'||Array.isArray(v))throw new CatalogError('VALIDATION_FAILED','attributes must be object');
  const s=JSON.stringify(v);
  if(s.length>12000)throw new CatalogError('VALIDATION_FAILED','attributes too large');
  return v as Record<string,unknown>;
}
export function assertInputFields(v:unknown,allowed:string[]):Record<string,unknown> {
  if(!v||typeof v!=='object'||Array.isArray(v))
    throw new CatalogError('VALIDATION_FAILED','Expected object');
  const data=v as Record<string,unknown>;
  for(const key of Object.keys(data))if(!allowed.includes(key))
    throw new CatalogError('VALIDATION_FAILED','Unexpected or forbidden field: '+key);
  return data;
}
