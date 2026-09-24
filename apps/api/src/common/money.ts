import { Decimal } from '@prisma/client/runtime/library';

export const money = (value: Decimal.Value): Decimal => new Decimal(value).toDecimalPlaces(4);
export const addMoney = (...values: Decimal.Value[]): Decimal => values.reduce<Decimal>((sum, value) => sum.plus(value), money(0));
export const multiplyMoney = (value: Decimal.Value, quantity: number): Decimal => money(value).times(quantity).toDecimalPlaces(4);
export const percentage = (value: Decimal.Value, rate: Decimal.Value): Decimal => money(value).times(rate).div(100).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
