export type FeeType = 'STANDARD' | 'INSURANCE' | 'CORPORATE';

export interface FeeBreakdown {
  feeType: FeeType;
  baseAmount: number;
  discountRate: number;
  discountAmount: number;
  finalAmount: number;
  description: string;
}

export interface FeeCalculationStrategy {
  calculate(baseAmount: number): FeeBreakdown;
}

export class StandardFeeStrategy implements FeeCalculationStrategy {
  calculate(baseAmount: number): FeeBreakdown {
    return {
      feeType: 'STANDARD',
      baseAmount,
      discountRate: 0,
      discountAmount: 0,
      finalAmount: Number(baseAmount.toFixed(2)),
      description: 'Tarifa ambulatoria estándar sin convenio',
    };
  }
}

export class InsuranceFeeStrategy implements FeeCalculationStrategy {
  calculate(baseAmount: number): FeeBreakdown {
    const discountRate = 0.35;
    const discountAmount = Number((baseAmount * discountRate).toFixed(2));
    return {
      feeType: 'INSURANCE',
      baseAmount,
      discountRate,
      discountAmount,
      finalAmount: Number((baseAmount - discountAmount).toFixed(2)),
      description: 'Cobertura Seguro de Gastos Médicos Mayores (35% bonificado)',
    };
  }
}

export class CorporateFeeStrategy implements FeeCalculationStrategy {
  calculate(baseAmount: number): FeeBreakdown {
    const discountRate = 0.2;
    const discountAmount = Number((baseAmount * discountRate).toFixed(2));
    return {
      feeType: 'CORPORATE',
      baseAmount,
      discountRate,
      discountAmount,
      finalAmount: Number((baseAmount - discountAmount).toFixed(2)),
      description: 'Convenio Empresarial Coahuila (20% descuento corporativo)',
    };
  }
}

/**
 * Patrón de Comportamiento Strategy: selecciona polimórficamente el algoritmo
 * de cálculo de honorarios médicos evitando condicionales rígidos.
 */
export class FeeCalculatorContext {
  private static readonly strategies: Record<FeeType, FeeCalculationStrategy> = {
    STANDARD: new StandardFeeStrategy(),
    INSURANCE: new InsuranceFeeStrategy(),
    CORPORATE: new CorporateFeeStrategy(),
  };

  static resolve(feeType: FeeType): FeeCalculationStrategy {
    return this.strategies[feeType] || this.strategies.STANDARD;
  }

  static calculate(baseAmount: number, feeType: FeeType): FeeBreakdown {
    return this.resolve(feeType).calculate(baseAmount);
  }
}
