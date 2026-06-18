/**
 * Run:
 *   npx ts-node --skip-project --compiler-options '{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"lib":["ES2020","DOM"]}' scripts/test-csv-parsers.ts
 */

import { strict as assert } from 'assert';
import { parseCombinedCommodityDataCSV } from '../src/utils/csvParsers';

function main() {
    const csv = [
        'currency_,units_,valueOp_,price_,logo_',
        'QQQ,12.5 QQQ,1000.25 USD,80.02,https://example.com/qqq.png',
        'CLOSED,-0.125 CLOSED,-10.50 USD,84,None',
        'UNPRICED,-2 UNPRICED,-2 UNPRICED,None,None',
    ].join('\n');

    const result = parseCombinedCommodityDataCSV(csv, 'USD');

    assert.equal(result.get('QQQ')?.holdings, 12.5);
    assert.equal(result.get('QQQ')?.valueOp, 1000.25);
    assert.equal(result.get('QQQ')?.holdingsRaw, '12.5 QQQ');

    assert.equal(result.get('CLOSED')?.holdings, -0.125);
    assert.equal(result.get('CLOSED')?.valueOp, -10.5);
    assert.equal(result.get('CLOSED')?.holdingsRaw, '-0.125 CLOSED');

    assert.equal(result.get('UNPRICED')?.holdings, -2);
    assert.equal(result.get('UNPRICED')?.valueOp, 0);
    assert.equal(result.get('UNPRICED')?.price, null);
    assert.equal(result.get('UNPRICED')?.logo, null);

    console.log('csv parser tests passed');
}

main();
