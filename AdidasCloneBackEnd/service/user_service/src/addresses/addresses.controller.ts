import { Controller } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RMQ_PATTERN_ADDRESS } from 'src/common/constants/rmq.pattern';
import { AddressDTO } from './dto/address.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_ADDRESS.GET_ADDRESSES })
  async getAddresses(
    @Payload() data: any,
  ): Promise<{ message: string; data: AddressDTO } | {}> {
    const response = await this.addressesService.getAddresses();
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ADDRESS.POST_ADDRESS })
  async createAddresses(@Payload() data: CreateAddressDto) {
    const response = await this.addressesService.createAddresses(data);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ADDRESS.UPDATE_ADDRESS })
  async updateAddresses(@Payload() data: any) {
    const { id, address } = data;

    const response = await this.addressesService.updateAddresses(+id, address);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ADDRESS.DELETE_ADDRESS })
  async deleteAddresses(@Payload() data: any) {
    const response = await this.addressesService.deleteAddresses(+data);
    return response;
  }
}
