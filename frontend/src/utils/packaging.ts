import { PackagingUnitConfig, Product } from '../types/pos';

export type PackLevels = {
  primary: string;
  intermediate: string;
  base: string;
  interMul: number;
  baseMul: number;
};

export function getPackLevels(
  product?: Product | null,
  cfgOverride?: PackagingUnitConfig | null
): PackLevels | null {
  const cfg = cfgOverride || product?.packagingConfig;
  if (!cfg) return null;

  const primary = cfg.primaryUnit || cfg.level1Name;
  const intermediate = cfg.intermediateUnit || cfg.level2Name;
  const base = cfg.baseUnit || cfg.level3Name || product?.unit;
  const interMul = Number(cfg.intermediateMultiplier ?? cfg.level2PerLevel1 ?? 0);
  const baseMul = Number(cfg.baseMultiplier ?? cfg.level3PerLevel2 ?? 0);

  const explicitMulti = cfg.hasPackagingLevels === true;
  const hasNames = Boolean(primary && intermediate && base);
  const hasMuls = interMul > 0 && baseMul > 0;

  if (!explicitMulti && !hasNames && !hasMuls) return null;
  if (!hasNames || !hasMuls) return null;

  return {
    primary: primary!,
    intermediate: intermediate!,
    base: base!,
    interMul,
    baseMul,
  };
}

export function toBaseUnits(
  levels: PackLevels | null,
  qtyPrimary: number,
  qtyInter: number,
  qtyBase: number
): number {
  if (!levels) return Math.max(0, Number(qtyBase) || 0);
  return (
    Math.max(0, Number(qtyPrimary) || 0) * levels.interMul * levels.baseMul +
    Math.max(0, Number(qtyInter) || 0) * levels.baseMul +
    Math.max(0, Number(qtyBase) || 0)
  );
}

export function buildPackagingConfig(input: {
  mode: 'simple' | 'multi';
  baseUnit: string;
  primaryUnit?: string;
  interUnit?: string;
  interMul?: number;
  baseMul?: number;
}): PackagingUnitConfig | undefined {
  if (input.mode !== 'multi') return undefined;
  const interMul = Number(input.interMul) || 1;
  const baseMul = Number(input.baseMul) || 1;
  return {
    hasPackagingLevels: true,
    primaryUnit: input.primaryUnit || 'carton',
    intermediateUnit: input.interUnit || 'pack',
    intermediateMultiplier: interMul,
    baseUnit: input.baseUnit,
    baseMultiplier: baseMul,
    level1Name: input.primaryUnit || 'carton',
    level2Name: input.interUnit || 'pack',
    level2PerLevel1: interMul,
    level3Name: input.baseUnit,
    level3PerLevel2: baseMul,
  };
}
