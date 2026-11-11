import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  Matches,
  IsOptional,
  ArrayNotEmpty,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateAutomationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  instanceId: string;

  @IsUUID()
  @IsNotEmpty()
  shopeeCredentialId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  keywords: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  groupIds: string[];

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  frequencyMinutes?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyExecutionLimit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  jitterSeconds?: number = 10;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'windowStartTime deve estar no formato HH:mm (ex: 08:00)',
  })
  windowStartTime?: string = '08:00';

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'windowEndTime deve estar no formato HH:mm (ex: 22:00)',
  })
  windowEndTime?: string = '22:00';

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  daysOfWeek?: number[] = [1, 2, 3, 4, 5, 6, 7]; // 1: Segunda a 7: Domingo

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  dedupWindowDays?: number = 7;

  @IsOptional()
  @IsIn(['ALL_SEQUENTIAL', 'RANDOM_ORDER', 'RANDOM_SINGLE'])
  dispatchStrategy?: 'ALL_SEQUENTIAL' | 'RANDOM_ORDER' | 'RANDOM_SINGLE' = 'ALL_SEQUENTIAL';

  @IsOptional()
  @IsUUID()
  groupRedirectLinkId?: string | null;

  @IsOptional()
  @IsUUID()
  couponId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  captionTemplate?: string | null;
}

export class UpdateAutomationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUUID()
  instanceId?: string;

  @IsOptional()
  @IsUUID()
  shopeeCredentialId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  groupIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  frequencyMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyExecutionLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  jitterSeconds?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  windowStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  windowEndTime?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  dedupWindowDays?: number;

  @IsOptional()
  @IsIn(['ALL_SEQUENTIAL', 'RANDOM_ORDER', 'RANDOM_SINGLE'])
  dispatchStrategy?: 'ALL_SEQUENTIAL' | 'RANDOM_ORDER' | 'RANDOM_SINGLE';

  @IsOptional()
  @IsUUID()
  groupRedirectLinkId?: string | null;

  @IsOptional()
  @IsUUID()
  couponId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  captionTemplate?: string | null;
}

export class QueryAutomationsDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'INACTIVE', 'DELETED'])
  status?: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'DELETED';

  @IsOptional()
  @IsString()
  search?: string;
}
