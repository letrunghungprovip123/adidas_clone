import {Module,Controller,Get,ServiceUnavailableException} from '@nestjs/common';
import {CatalogDatabase} from './database';
import {CatalogService} from './catalog.service';
import {CatalogMediaReviewsAI} from './media-reviews-ai';
import {CatalogRmqController} from './catalog.rmq.controller';
import {CatalogSearch} from './search';

@Controller('health')
class CatalogHealthController {
 constructor(private readonly db:CatalogDatabase){}
 @Get('live')live(){return {status:'ok'}}
 @Get('ready')async ready(){
  try{await this.db.ready();return{status:'ok',info:{postgres:{status:'up'}}}}
  catch{throw new ServiceUnavailableException('catalog database not ready')}
 }
}
@Module({
 controllers:[CatalogHealthController,CatalogRmqController],
 providers:[CatalogDatabase,CatalogService,CatalogMediaReviewsAI,
  {provide:CatalogSearch,useFactory:(db:CatalogDatabase)=>
   new CatalogSearch(db,process.env.V2_CATALOG_ES_URL||'http://elasticsearch:9200'),inject:[CatalogDatabase]}],
 exports:[CatalogDatabase,CatalogService,CatalogMediaReviewsAI,CatalogSearch]
})
export class CatalogModule {}
