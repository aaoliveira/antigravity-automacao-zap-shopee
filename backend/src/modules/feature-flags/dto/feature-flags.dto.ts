import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFeatureFlagsDto {
  @IsOptional()
  @IsBoolean({ message: 'ml_alternative_b_enabled deve ser booleano.' })
  ml_alternative_b_enabled?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'ml_alternative_a_enabled deve ser booleano.' })
  ml_alternative_a_enabled?: boolean;
}
