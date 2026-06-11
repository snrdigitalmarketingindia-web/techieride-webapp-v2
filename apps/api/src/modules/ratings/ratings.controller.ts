import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { RatingsService } from './ratings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class SubmitRatingDto {
  @IsUUID() rideId: string;
  @IsUUID() rateeId: string;
  @IsInt() @Min(1) @Max(5) score: number;
  @IsString() @IsOptional() comment?: string;
}

@ApiTags('Ratings')
@ApiBearerAuth()
@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitRatingDto,
  ) {
    return this.ratingsService.submitRating(userId, dto);
  }

  @Get('ride/:rideId')
  getRideRatings(
    @Param('rideId') rideId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ratingsService.getRideRatings(rideId, userId);
  }

  @Get('pending')
  getPending(@CurrentUser('id') userId: string) {
    return this.ratingsService.getPendingRatings(userId);
  }

  @Get('stats/:userId')
  getUserStats(@Param('userId') userId: string) {
    return this.ratingsService.getUserRatingStats(userId);
  }
}
