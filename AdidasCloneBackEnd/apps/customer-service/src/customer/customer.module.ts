import {Module} from '@nestjs/common';
import {CustomerDatabase} from './database';
import {CustomerService} from './customer.service';
import {CustomerHealthController,CustomerRmqController} from './transport';
import {LoyaltyExpiryWorker} from './workers';
@Module({
 controllers:[CustomerHealthController,CustomerRmqController],
 providers:[CustomerDatabase,CustomerService,LoyaltyExpiryWorker],
 exports:[CustomerDatabase,CustomerService]
})
export class CustomerModule{}
