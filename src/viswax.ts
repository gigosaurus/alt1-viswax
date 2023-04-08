/**
 * Calculator for determining optimal Vis Wax combinations (including 3rd rune) based on an algorithm.
 * @author Jayden
 * @author Cook Me Plox
 */

const InputRunes = [
    {index: 0, name: 'Air', img: 'Air_rune.png', amount: 1000, id: 556, price: 0},
    {index: 1, name: 'Water', img: 'Water_rune.png', amount: 1000, id: 555, price: 0},
    {index: 2, name: 'Earth', img: 'Earth_rune.png', amount: 1000, id: 557, price: 0},
    {index: 3, name: 'Fire', img: 'Fire_rune.png', amount: 1000, id: 554, price: 0},
    {index: 4, name: 'Dust', img: 'Dust_rune.png', amount: 500, id: 4696, price: 0},
    {index: 5, name: 'Lava', img: 'Lava_rune.png', amount: 500, id: 4699, price: 0},
    {index: 6, name: 'Mist', img: 'Mist_rune.png', amount: 500, id: 4695, price: 0},
    {index: 7, name: 'Mud', img: 'Mud_rune.png', amount: 300, id: 4698, price: 0},
    {index: 8, name: 'Smoke', img: 'Smoke_rune.png', amount: 500, id: 4697, price: 0},
    {index: 9, name: 'Steam', img: 'Steam_rune.png', amount: 500, id: 4694, price: 0},
    {index: 10, name: 'Mind', img: 'Mind_rune.png', amount: 2000, id: 558, price: 0},
    {index: 11, name: 'Body', img: 'Body_rune.png', amount: 2000, id: 559, price: 0},
    {index: 12, name: 'Cosmic', img: 'Cosmic_rune.png', amount: 400, id: 564, price: 0},
    {index: 13, name: 'Chaos', img: 'Chaos_rune.png', amount: 500, id: 562, price: 0},
    {index: 14, name: 'Nature', img: 'Nature_rune.png', amount: 350, id: 561, price: 0},
    {index: 15, name: 'Law', img: 'Law_rune.png', amount: 300, id: 563, price: 0},
    {index: 16, name: 'Death', img: 'Death_rune.png', amount: 400, id: 560, price: 0},
    {index: 17, name: 'Astral', img: 'Astral_rune.png', amount: 300, id: 9075, price: 0},
    {index: 18, name: 'Blood', img: 'Blood_rune.png', amount: 350, id: 565, price: 0},
    {index: 19, name: 'Soul', img: 'Soul_rune.png', amount: 300, id: 566, price: 0},
];

const VIX_WAX_ID = 32092;
let vixWaxPrice = 0;
const GE_PRICES_URL = 'https://api.weirdgloop.org/exchange/history/rs/latest?id=554|555|556|557|558|559|560|561|562|563|564|565|566|4694|4695|4696|4697|4698|4699|9075|32092';

// Number of days between 1 Jan 1970 and 27 Feb 2002
const RUNEDATE_OFFSET = 11745;

/**
 * ALGORITHM FOR THE CALCULATOR BELOW THIS LINE.
 */

const ADDEND = 0xB;
const MASK = Math.pow(2, 48);
const POW17 = Math.pow(2, 17);
const POW32 = Math.pow(2, 32);

const CHUNK = Math.pow(2, 16);
const MAGIC0 = 0xE66D;
const MAGIC1 = 0xDEEC;
const MAGIC2 = 0x5;

const slot2params = [[2, -2], [3, -1], [4, 2]];

const NUM_BEST_OPTIONS = 19;
const NUM_RUNES = InputRunes.length;

function safemul(seed) {
    var s0 = seed % CHUNK;
    var s1 = Math.floor(seed / CHUNK) % CHUNK;
    var s2 = Math.floor(seed / CHUNK / CHUNK);

    var carry = 0;

    var r0 = (s0 * MAGIC0) + carry;
    carry = Math.floor(r0 / CHUNK);
    r0 = r0 % CHUNK;

    var r1 = (s1 * MAGIC0 + s0 * MAGIC1) + carry;
    carry = Math.floor(r1 / CHUNK);
    r1 = r1 % CHUNK;

    var r2 = (s2 * MAGIC0 + s1 * MAGIC1 + s0 * MAGIC2) + carry;

    r2 = r2 % CHUNK;
    return r2 * CHUNK * CHUNK + r1 * CHUNK + r0;
}

function random(input_seed) {
    var s0 = (input_seed % CHUNK) ^ MAGIC0;
    var s1 = ((input_seed / CHUNK) % CHUNK) ^ MAGIC1;
    var s2 = ((input_seed / CHUNK / CHUNK) % CHUNK) ^ MAGIC2;

    var seed = s2 * CHUNK * CHUNK + s1 * CHUNK + s0;
    return function(n) {
        seed = (safemul(seed) + ADDEND) % MASK;
        return Math.floor(seed / POW17) % n;
    };
}

function computeRuneOne(runedate) {
    var slot1best = random(runedate * POW32)(NUM_BEST_OPTIONS);
    var slot1scores = Array(NUM_RUNES);
    slot1scores[slot1best] = 30;
    var used = new Set();
    var slot1rand = random(runedate * POW32 + 1);
    slot1rand(29); // throw away
    for (var offset = 1; offset < NUM_RUNES; offset++) {
        var score = slot1rand(29) + 1;
        while (used.has(score)) {
            score = (score + 1) % 29;
        }
        slot1scores[(slot1best + offset) % NUM_RUNES] = score;
        used.add(score);
    }

    return [slot1best, slot1scores];
}

function computeForRunedate(runedate, inputs) {
    const SLOT3RANGE = 8220;

    runedate = runedate || 0;

    let result = computeRuneOne(runedate);
    let slot1best = result[0];
    let slot1scores = result[1];

    let slot2scores = [Array(NUM_RUNES), Array(NUM_RUNES), Array(NUM_RUNES)];
    let slot2bests = Array(3);
    for (let i = 0; i < 3; i++) {
        let curr = slot2params[i];
        let multiplier = curr[0],
            final_offset = curr[1];
        slot2bests[i] = (random(multiplier * runedate * POW32)(NUM_BEST_OPTIONS) + final_offset + NUM_BEST_OPTIONS) % NUM_BEST_OPTIONS;
        if (slot1best === slot2bests[i]) {
            slot2bests[i] += 1;
        }
        slot2scores[i][slot2bests[i]] = 30;
        let used = new Set();
        let slot2rand = random(multiplier * runedate * POW32 + multiplier);
        slot2rand(29); // throw away
        for (let offset = 1; offset < NUM_RUNES; offset++) {
            let score = slot2rand(29) + 1;
            while (used.has(score)) {
                score = (score + 1) % 29;
            }
            slot2scores[i][(slot2bests[i] + offset) % NUM_RUNES] = score;
            used.add(score);
        }
    }

    // slight performance hack: flat array makes everything about 25% faster
    let slot3scores = new Int8Array(SLOT3RANGE * NUM_RUNES);
    let slot3bests = new Int8Array(SLOT3RANGE);
    for (let pid = 0; pid < SLOT3RANGE; pid++) {
        // hack to keep intermediate values below 2^48
        let seed = POW32 * (runedate * pid % CHUNK) + pid;
        let slot3rand = random(seed);
        let slot3best = slot3rand(NUM_BEST_OPTIONS);
        if (slot3best === slot1best) {
            // we can at least increment against slot1 always
            slot3best += 1;
        }
        slot3bests[pid] = slot3best;
        slot3scores[pid*NUM_RUNES] = 40;
        let used = new Set();
        for (let i = 1; i < NUM_RUNES; i++) {
            let score = slot3rand(39) + 1;
            while (used.has(score)) {
                score = (score + 1) % 39;
            }
            used.add(score);
            slot3scores[pid*NUM_RUNES+i] = score;
        }
    }

    let possibleparams = [];
    let possiblescores = [];
    for (let slot2 = 0; slot2 < 3; slot2++) {
        for (let pid = 0; pid < SLOT3RANGE; pid++) {
            let slot3best = slot3bests[pid];
            if (slot3best === slot2bests[slot2]) {
                slot3best = (slot3best + 1) % NUM_RUNES;
                if (slot3best === slot1best) {
                    // 18/8000 edge case that of course someone hit on day 1
                    slot3best = (slot3best + 1) % NUM_RUNES;
                }
            }

            let good = inputs.every(function(input) {
                let index = (input.runes[2] - slot3best + NUM_RUNES) % NUM_RUNES;
                return input.score === slot1scores[input.runes[0]] + slot2scores[slot2][input.runes[1]] + slot3scores[pid*NUM_RUNES+index];
            });
            if (good) {
                possibleparams.push([slot2, pid]);
                var possiblescore = Array(NUM_RUNES);
                for (let i = 0; i < NUM_RUNES;  i++) {
                    possiblescore[(slot3best+i) % NUM_RUNES] = slot3scores[pid*NUM_RUNES+i];
                }
                possiblescores.push(possiblescore)
            }
        }
    }
    return {
        slot1best: slot1best,
        slot2bests: slot2bests,
        slot1scores: slot1scores,
        slot2scores: slot2scores,
        possibleparams: possibleparams,
        possiblescores: possiblescores
    };
}

// computes the most profitable disjoint set of 3 runes.
// not the most efficient, but it doesn't really need to be
export function computeBestTrio(slotprofits) {
    var bestTrio = [];
    var bestProfit = -999999999;
    var bestScore = -999999999;

    for (var i = 0; i < NUM_RUNES; i++) {
        for (var j = 0; j < NUM_RUNES; j++) {
            for (var k = 0; k < NUM_RUNES; k++) {
                if (slotprofits[0][i].rune === slotprofits[1][j].rune || slotprofits[0][i].rune === slotprofits[2][k].rune || slotprofits[1][j].rune === slotprofits[2][k].rune) {
                    continue;
                }
                var profit = slotprofits[0][i].profit + slotprofits[1][j].profit + slotprofits[2][k].profit;
                if (profit > bestProfit) {
                    bestTrio = [slotprofits[0][i].rune, slotprofits[1][j].rune, slotprofits[2][k].rune];
                    bestScore = slotprofits[0][i].score + slotprofits[1][j].score + slotprofits[2][k].score
                    bestProfit = profit;
                    break; // we are sorted by profit, so if we find a match, it's the best for this k-value

                }
            }
        }
    }
    return {bestTrio: bestTrio, bestScore: bestScore, bestProfit: bestProfit};
}

// Function to calculate the current inputs and output the result on the UI
export function calculateResult(inputs) {
    let runedate = Math.floor(Date.now()/86400000) - RUNEDATE_OFFSET;
    return computeForRunedate(runedate, inputs);
}

export function prepareInput(rune1, rune2, rune3, score) {
    return {
        runes: [runeNameToIndex(rune1), runeNameToIndex(rune2), runeNameToIndex(rune3)],
        score: score
    }
}

export function runeIndexToName(rune: number) {
    for (const key of InputRunes) {
        if (key.index === rune) {
            return key.name;
        }
    }

    return 'None';
}

export function runeNameToIndex(rune: string) {
    for (const key of InputRunes) {
        if (key.name === rune) {
            return key.index;
        }
    }

    return -1;
}

export async function lookupPrices() {
    let response = await fetch(GE_PRICES_URL);
    let data = await response.json();

    for (const key in data) {
        if (key == VIX_WAX_ID.toString(10)) {
            vixWaxPrice = data[key].price;
        } else {
            for (const k of InputRunes) {
                if (key == k.id.toString(10)) {
                    k.price = data[key].price;
                    break;
                }
            }
        }
    }
}

export function makeScoreTable(scores) {
    var runes = Array(NUM_RUNES);
    for (var i = 0; i < NUM_RUNES; i++) {
        runes[i] = {
            rune: i,
            score: scores[i],
            profit: scores[i] * vixWaxPrice - InputRunes[i].amount * InputRunes[i].price,
            name: InputRunes[i].name,
            img: InputRunes[i].img
        }
    }

    runes.sort(function(a, b) {
        return b.profit - a.profit;
    })

    return runes;
}

export async function isSetup() {
    return vixWaxPrice !== 0;
}