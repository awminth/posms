/**
 * Resync catalog to Myanmar product names + clean verifiable branch stock.
 * Usage: npm run db:resync-mm (from backend/)
 */
import 'dotenv/config';
import { getPool } from '../config/db.js';
import { backfillOpeningLots } from '../services/stockLotService.js';
import { newId } from '../utils/helpers.js';

const products: {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  cost: number;
  sell: number;
}[] = [
  {
    id: 'p-01',
    categoryId: 'cat-01',
    name: 'ကာရမ်မယ် မက်ချီယာတို (ရေခဲ)',
    description: 'အက်စ်ပရက်ဆို၊ ဗန်နီလာ၊ ကာရမ်မယ်',
    unit: 'ခွက်',
    cost: 2200,
    sell: 4800,
  },
  {
    id: 'p-02',
    categoryId: 'cat-01',
    name: 'စပိန် လတ်တေး',
    description: 'အက်စ်ပရက်ဆို + နို့ချို / နို့လတ်',
    unit: 'ခွက်',
    cost: 2000,
    sell: 4500,
  },
  {
    id: 'p-03',
    categoryId: 'cat-01',
    name: 'မက်ချာ လတ်တေး',
    description: 'ဂျပန် မက်ချာ လတ်တေး',
    unit: 'ခွက်',
    cost: 2500,
    sell: 5200,
  },
  {
    id: 'p-04',
    categoryId: 'cat-01',
    name: 'အမေရိကာနို (ပူ/ရေခဲ)',
    description: 'အာရာဘီကာ အက်စ်ပရက်ဆို နှစ်ချက်',
    unit: 'ခွက်',
    cost: 1400,
    sell: 3500,
  },
  {
    id: 'p-05',
    categoryId: 'cat-02',
    name: 'ထောပတ် ခရောဆွန်',
    description: 'ထောပတ် ခရောဆွန် အစိမ်းအလွှာ',
    unit: 'ခု',
    cost: 1500,
    sell: 3200,
  },
  {
    id: 'p-06',
    categoryId: 'cat-02',
    name: 'ချောကလက် ပေါင်',
    description: 'ချောကလက် ထည့်ထားသော ပေါင်',
    unit: 'ခု',
    cost: 1800,
    sell: 3800,
  },
  {
    id: 'p-07',
    categoryId: 'cat-02',
    name: 'ဘာ့စ်ခ် ချိစ်ကိတ်',
    description: 'စပိန်ပုံစံ ချိစ်ကိတ် အချပ်',
    unit: 'ချပ်',
    cost: 2800,
    sell: 6000,
  },
  {
    id: 'p-08',
    categoryId: 'cat-03',
    name: 'ကြက်သား ပန်နီနီ',
    description: 'မီးခိုးကြက်သား + ပက်စတို ပန်နီနီ',
    unit: 'ခု',
    cost: 3200,
    sell: 6800,
  },
  {
    id: 'p-09',
    categoryId: 'cat-03',
    name: 'ထောပတ်သီး ကွီနိုအာ ပန်းကန်',
    description: 'ထောပတ်သီး၊ ကွီနိုအာ၊ ဟင်းသီးဟင်းရွက်',
    unit: 'ပန်းကန်',
    cost: 3500,
    sell: 7500,
  },
  {
    id: 'p-10',
    categoryId: 'cat-04',
    name: 'ထရက်ဖယ် ချစ်ပ်',
    description: 'ထရက်ဖယ် + ပါမီဆန် အာလူးချစ်ပ်',
    unit: 'ထုပ်',
    cost: 1600,
    sell: 3500,
  },
  {
    id: 'p-11',
    categoryId: 'cat-05',
    name: 'သာမို ခွက် ၅၀၀ml',
    description: 'သံမဏိ နှစ်လွှာ သာမိုခွက်',
    unit: 'ခု',
    cost: 8500,
    sell: 18500,
  },
];

const categories: { id: string; name: string }[] = [
  { id: 'cat-01', name: 'ကော်ဖီနှင့် သောက်စရာ' },
  { id: 'cat-02', name: 'မုန့်နှင့် ပေါင်' },
  { id: 'cat-03', name: 'အစားအစာ' },
  { id: 'cat-04', name: 'သရေစာ' },
  { id: 'cat-05', name: 'အရောင်းပစ္စည်း' },
];

/** Clear verifiable stock: Warehouse / Downtown / Hledan / Mandalay */
const stockPlan: Record<string, { wh: number; ygn1: number; ygn2: number; mdy: number }> = {
  'p-01': { wh: 200, ygn1: 40, ygn2: 30, mdy: 25 },
  'p-02': { wh: 180, ygn1: 35, ygn2: 28, mdy: 20 },
  'p-03': { wh: 120, ygn1: 25, ygn2: 20, mdy: 15 },
  'p-04': { wh: 220, ygn1: 50, ygn2: 40, mdy: 35 },
  'p-05': { wh: 80, ygn1: 20, ygn2: 15, mdy: 12 },
  'p-06': { wh: 70, ygn1: 18, ygn2: 12, mdy: 10 },
  'p-07': { wh: 40, ygn1: 10, ygn2: 8, mdy: 6 },
  'p-08': { wh: 50, ygn1: 15, ygn2: 10, mdy: 8 },
  'p-09': { wh: 60, ygn1: 15, ygn2: 10, mdy: 8 },
  'p-10': { wh: 100, ygn1: 30, ygn2: 25, mdy: 20 },
  'p-11': { wh: 40, ygn1: 12, ygn2: 8, mdy: 6 },
};

const branchMap = [
  { id: 'b-04', key: 'wh' as const },
  { id: 'b-01', key: 'ygn1' as const },
  { id: 'b-02', key: 'ygn2' as const },
  { id: 'b-03', key: 'mdy' as const },
];

async function main() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const c of categories) {
      await conn.query(`UPDATE categories SET name = ? WHERE id = ?`, [c.name, c.id]);
    }

    for (const p of products) {
      await conn.query(
        `UPDATE products SET
          category_id = ?, name = ?, description = ?, unit = ?,
          cost_price = ?, selling_price = ?
         WHERE id = ?`,
        [p.categoryId, p.name, p.description, p.unit, p.cost, p.sell, p.id]
      );
    }

    // Clear lots for catalog products so backfill can recreate clean opening lots
    try {
      await conn.query(
        `DELETE FROM stock_lots WHERE product_id IN (${products.map(() => '?').join(',')})`,
        products.map((p) => p.id)
      );
    } catch {
      /* table may not exist yet */
    }

    await conn.query(
      `DELETE FROM branch_stocks WHERE product_id IN (${products.map(() => '?').join(',')})`,
      products.map((p) => p.id)
    );

    for (const p of products) {
      const plan = stockPlan[p.id];
      if (!plan) continue;
      for (const b of branchMap) {
        const qty = plan[b.key];
        await conn.query(
          `INSERT INTO branch_stocks
            (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
           VALUES (?, ?, ?, ?, 10, ?, 'Shelf')`,
          [newId('bs'), b.id, p.id, qty, Math.max(qty, 20)]
        );
      }
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const created = await backfillOpeningLots();
  console.log('Myanmar catalog + stock resynced.');
  console.log('Opening lots created/checked:', created);
  console.log('Verify example p-09 (ထောပတ်သီး ကွီနိုအာ ပန်းကန်): WH 60 + YGN01 15 + YGN02 10 + MDY 8 = 93');
  await getPool().end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await getPool().end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
