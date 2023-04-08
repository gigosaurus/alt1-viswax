//alt1 base libs, provides all the commonly used methods for image matching and capture
//also gives your editor info about the window.alt1 api
import * as a1lib from "@alt1/base";
import {ImageDetect, ImgRef} from "@alt1/base";
import * as OCR from "@alt1/ocr";
import {ColortTriplet} from "@alt1/ocr";

import * as viswaxcalc from "./viswax";

require("!file-loader?name=[name].[ext]!./index.html");
require("!file-loader?name=[name].[ext]!./appconfig.json");
require("!file-loader?name=[name].[ext]!./icon.png");
require("!file-loader?name=[name].[ext]!./settingscog.png");

let output = document.getElementById("output");

//loads all images as raw pixel data async, images have to be saved as *.data.png
//this also takes care of metadata headers in the image that make browser load the image
//with slightly wrong colors
//this function is async, so you cant acccess the images instantly but generally takes <20ms
//use `await imgs.promise` if you want to use the images as soon as they are loaded
const imgs = a1lib.ImageDetect.webpackImages({
    topLeft: require("./img/top-left.data.png"),
    visLeft: require("./img/vis-left.data.png"),
    smile1: require("./img/smile-1.data.png"),
    smile2: require("./img/smile-2.data.png"),
    smile3: require("./img/smile-3.data.png"),
});

const runeImages = a1lib.ImageDetect.webpackImages({
    None: require("./img/no-rune.data.png"),
    Air: require("./img/air-rune.data.png"),
    Water: require("./img/water-rune.data.png"),
    Earth: require("./img/earth-rune.data.png"),
    Fire: require("./img/fire-rune.data.png"),
    Dust: require("./img/dust-rune.data.png"),
    Lava: require("./img/lava-rune.data.png"),
    Mist: require("./img/mist-rune.data.png"),
    Mud: require("./img/mud-rune.data.png"),
    Smoke: require("./img/smoke-rune.data.png"),
    Steam: require("./img/steam-rune.data.png"),
    Mind: require("./img/mind-rune.data.png"),
    Body: require("./img/body-rune.data.png"),
    Cosmic: require("./img/cosmic-rune.data.png"),
    Chaos: require("./img/chaos-rune.data.png"),
    Nature: require("./img/nature-rune.data.png"),
    Law: require("./img/law-rune.data.png"),
    Death: require("./img/death-rune.data.png"),
    Astral: require("./img/astral-rune.data.png"),
    Blood: require("./img/blood-rune.data.png"),
    Soul: require("./img/soul-rune.data.png"),
});

const runesAvailableImages = a1lib.ImageDetect.webpackImages({
    Air: require("./img/select-air-rune.data.png"),
    Water: require("./img/select-water-rune.data.png"),
    Earth: require("./img/select-earth-rune.data.png"),
    Fire: require("./img/select-fire-rune.data.png"),
    Body: require("./img/select-body-rune.data.png"),
    Mind: require("./img/select-mind-rune.data.png"),
    Chaos: require("./img/select-chaos-rune.data.png"),
    Law: require("./img/select-law-rune.data.png"),
    Nature: require("./img/select-nature-rune.data.png"),
    Cosmic: require("./img/select-cosmic-rune.data.png"),
    Soul: require("./img/select-soul-rune.data.png"),
    Astral: require("./img/select-astral-rune.data.png"),
    Blood: require("./img/select-blood-rune.data.png"),
    Death: require("./img/select-death-rune.data.png"),
    Dust: require("./img/select-dust-rune.data.png"),
    Lava: require("./img/select-lava-rune.data.png"),
    Mist: require("./img/select-mist-rune.data.png"),
    Mud: require("./img/select-mud-rune.data.png"),
    Smoke: require("./img/select-smoke-rune.data.png"),
    Steam: require("./img/select-steam-rune.data.png"),
});

let calcForProfit = true;
let disallowedRunes = {};

let unavailableRunes = [];
let checkedForAvailableRunes = false;

let previousRuneInputs = [];

let suggestion = [0, 1, 2];

let lastDisplaySuggestion = [0, 0, 0, '', '', ''];

let lastVisCalc = [];

let foundBest = false;
let bestProfit = 0;
let bestVis = 0;

a1lib.PasteInput.listen(img => {
    if (!viswaxcalc.isSetup()) {
        viswaxcalc.lookupPrices().then(() => process(img));
    } else {
        process(img);
    }
}, (err, errid) => {
    output.insertAdjacentHTML("beforeend", `<div><b>${errid}</b>  ${err}</div>`);
});

function capture() {
	process(a1lib.captureHoldFullRs());
}

function process(img: ImgRef) {
    let topLeft = img.findSubimage(imgs.topLeft);
    if (topLeft.length === 0) {
        return;
    }

    if (!checkedForAvailableRunes) {
        findAvailableRunes(img);
        checkedForAvailableRunes = true;
    }

    // 465 x 293
    const visMachine = img.toData(topLeft[0].x, topLeft[0].y, 465, 293);
    const slot1 = img.toData(topLeft[0].x + 38, topLeft[0].y + 77, 50, 50);
    const slot2 = img.toData(topLeft[0].x + 38, topLeft[0].y + 137, 50, 50);
    const slot3 = img.toData(topLeft[0].x + 38, topLeft[0].y + 197, 50, 50);

    const slot1Rune = getRuneInSlot(slot1);
    const slot2Rune = getRuneInSlot(slot2);
    const slot3Rune = getRuneInSlot(slot3);

    const vis = findVis(visMachine);

    if (slot1Rune === 'None' || slot2Rune === 'None' || slot3Rune === 'None' || foundBest) {
        updateDisplay(topLeft[0].x, topLeft[0].y, slot1Rune, slot2Rune, slot3Rune);
    } else if (vis !== -1) {
        let input = viswaxcalc.prepareInput(slot1Rune, slot2Rune, slot3Rune, vis);
        if (previousRuneInputs.length > 0) {
            let previousInput = previousRuneInputs[previousRuneInputs.length - 1];
            if (previousInput.runes[0] === input.runes[0] && previousInput.runes[1] === input.runes[1] && previousInput.runes[2] === input.runes[2]) {
                updateDisplay(topLeft[0].x, topLeft[0].y, slot1Rune, slot2Rune, slot3Rune);
                return;
            }
        }

        previousRuneInputs.push(input);
        let res = viswaxcalc.calculateResult(previousRuneInputs);
        lastVisCalc = res.possibleparams;

        if (res.possibleparams.length === 1) {
            let scores = [res.slot1scores, res.slot2scores[res.possibleparams[0][0]], res.possiblescores[0]];

            let slotprofits = [];
            for (let i = 0; i < 3; i++) {
                let tableRes = viswaxcalc.makeScoreTable(scores[i]);
                slotprofits.push(tableRes);
            }

            slotprofits = removeDisallowedRunes(slotprofits);
            if (calcForProfit) {
                let bestTrioRes = viswaxcalc.computeBestTrio(slotprofits);
                suggestion = bestTrioRes.bestTrio;
                bestProfit = bestTrioRes.bestProfit;
                bestVis = bestTrioRes.bestScore;
            } else {
                slotprofits.sort(function(a, b) {
                    return b.score - a.score;
                })
                suggestion = computeMostVisTrio(slotprofits);
            }

            foundBest = true;
        } else {
            suggestion = calculateNewSuggestion();
        }

        updateDisplay(topLeft[0].x, topLeft[0].y, slot1Rune, slot2Rune, slot3Rune);
    }
}

function computeMostVisTrio(slotprofits) {
    bestVis = 0;

    let best = [];

    for (let i = 0; i < slotprofits[0].length; i++) {
        for (let j = 0; j < slotprofits[1].length; j++) {
            for (let k = 0; k < slotprofits[2].length; k++) {
                if (slotprofits[0][i].rune === slotprofits[1][j].rune || slotprofits[0][i].rune === slotprofits[2][k].rune || slotprofits[1][j].rune === slotprofits[2][k].rune) {
                    continue;
                }

                let score = slotprofits[0][i].score + slotprofits[1][j].score + slotprofits[2][k].score;
                if (score > bestVis) {
                    best = [slotprofits[0][i].rune, slotprofits[1][j].rune, slotprofits[2][k].rune];
                    bestVis = score;
                    bestProfit = slotprofits[0][i].profit + slotprofits[1][j].profit + slotprofits[2][k].profit;
                    break;
                }
            }
        }
    }

    return best;
}


function removeDisallowedRunes(slotprofits) {
    for (let i = 0; i < 3; i++) {
        for (const slot of slotprofits[i]) {
            if (disallowedRunes.hasOwnProperty(slot.name) && disallowedRunes[slot.name] === true) {
                slot.score = -1;
                slot.profit = -1;
            }
        }
    }

    return slotprofits;
}

function updateDisplay(x, y, slot1, slot2, slot3) {
    if (suggestion.length === 0) {
        output.innerText = "Could not calculate. Perhaps too many runes are disallowed?";
        return
    }

    let remove = highlightRemoveRunes(x, y, slot1, slot2, slot3);

    if (remove.length === 0) {
        if (slot1 === 'None') {
            highlightRune(x, y, viswaxcalc.runeIndexToName(suggestion[0]));
        } else if (slot2 === 'None') {
            highlightRune(x, y, viswaxcalc.runeIndexToName(suggestion[1]));
        } else if (slot3 === 'None') {
            highlightRune(x, y, viswaxcalc.runeIndexToName(suggestion[2]));
        }
    }

    if (lastDisplaySuggestion[0] === suggestion[0] && lastDisplaySuggestion[1] === suggestion[1] && lastDisplaySuggestion[2] === suggestion[2]
        && lastDisplaySuggestion[3] === slot1 && lastDisplaySuggestion[4] === slot2 && lastDisplaySuggestion[5] === slot3) {
        return;
    }

    lastDisplaySuggestion = [suggestion[0], suggestion[1], suggestion[2], slot1, slot2, slot3];

    output.innerHTML = '';
    for (const rune of suggestion) {
        let runeName = viswaxcalc.runeIndexToName(rune);
        let img = new Image();
        img.title = runeName;
        img.src = 'data:image/png;base64,' + runeImages[runeName].toPngBase64();
        img.style.display = 'block';
        output.appendChild(img);
    }

    let extra = document.createElement('div');
    extra.classList.add('nistext');
    if (foundBest) {
        if (calcForProfit) {
            extra.innerText = 'Profit: ' + bestProfit.toLocaleString('en');
        } else {
            extra.innerText = 'Vis: ' + bestVis;
        }
    } else if (lastVisCalc.length !== 0) {
        extra.innerText = lastVisCalc.length + ' remaining possibilities...';
    }
    output.appendChild(extra);
}

function calculateNewSuggestion() {
    while (true) {
        let slot1 = Math.floor(Math.random() * 20);
        let slot2 = Math.floor(Math.random() * 20);
        let slot3 = Math.floor(Math.random() * 20);

        if (unavailableRunes.indexOf(slot1) === -1 && unavailableRunes.indexOf(slot2) === -1 && unavailableRunes.indexOf(slot3) === -1) {
            if (slot1 !== slot2 && slot1 !== slot3 && slot2 !== slot3) {
                for (let i = 0; i < previousRuneInputs.length; i++) {
                    if (previousRuneInputs[i][0] !== slot1 && previousRuneInputs[i][1] !== slot2 && previousRuneInputs[i][2] !== slot3) {
                        return [slot1, slot2, slot3];
                    }
                }
            }
        }
    }
}

function highlightRemoveRunes(x, y, slot1, slot2, slot3) {
    let remove = [];

    if (slot1 !== 'None' && viswaxcalc.runeNameToIndex(slot1) !== suggestion[0]) {
        remove.push(1);
        if (alt1.permissionOverlay) {
            alt1.overLayRect(a1lib.mixColor(255, 255, 255), x + 38, y + 77, 50, 50, 1000, 3);
        }
    }
    if (slot2 !== 'None' && viswaxcalc.runeNameToIndex(slot2) !== suggestion[1]) {
        remove.push(2);
        if (alt1.permissionOverlay) {
            alt1.overLayRect(a1lib.mixColor(255, 255, 255), x + 38, y + 137, 50, 50, 1000, 3);
        }
    }
    if (slot3 !== 'None' && viswaxcalc.runeNameToIndex(slot3) !== suggestion[2]) {
        remove.push(3);
        if (alt1.permissionOverlay) {
            alt1.overLayRect(a1lib.mixColor(255, 255, 255), x + 38, y + 197, 50, 50, 1000, 3);
        }
    }

    return remove;
}

function highlightRune(x, y, rune: string) {
    const grid = {
        Air: [0, 0],
        Water: [0, 1],
        Earth: [0, 2],
        Fire: [0, 3],
        Dust: [1, 0],
        Lava: [1, 1],
        Mist: [1, 2],
        Mud: [1, 3],
        Smoke: [2, 0],
        Steam: [2, 1],
        Mind: [2, 2],
        Body: [2, 3],
        Cosmic: [3, 0],
        Chaos: [3, 1],
        Nature: [3, 2],
        Law: [3, 3],
        Death: [4, 0],
        Astral: [4, 1],
        Blood: [4, 2],
        Soul: [4, 3]
    }

    let pos = grid[rune];

    if (alt1.permissionOverlay) {
        alt1.overLayRect(a1lib.mixColor(255, 255, 255), x + 289 + pos[1] * 41, y + 67 + pos[0] * 37, 41, 37, 1000, 3);
    }
}

function findAvailableRunes(img: ImgRef) {
    for (const runeImagesKey in runesAvailableImages) {
        if (img.findSubimage(runesAvailableImages[runeImagesKey]).length === 0) {
            unavailableRunes.push(viswaxcalc.runeNameToIndex(runeImagesKey));
        }
    }
}

function getRuneInSlot(slot: ImageData) {
    for (const runeImagesKey in runeImages) {
        if (ImageDetect.simpleCompare(slot, runeImages[runeImagesKey], 0, 0) != Infinity) {
            return runeImagesKey;
        }
    }

    return 'None';
}

function findVis(buf: ImageData) {
    const visFont = {
        width: 12, spacewidth: 3, shadow: false, height: 11, basey: 8, chars: [
            {width: 7, bonus: 90, chr: "0", pixels: [1,2,157, 1,3,221, 1,4,255, 1,5,255, 1,6,238, 1,7,172, 2,1,194, 2,2,127, 2,7,72, 2,8,210, 3,1,189, 3,8,188, 4,1,225, 4,2,72, 4,7,72, 4,8,210, 5,2,170, 5,3,255, 5,4,187, 5,5,188, 5,6,239, 5,7,172], secondary: false},
            {width: 7, bonus: 70, chr: "1", pixels: [1,2,86, 1,8,65, 2,1,109, 2,2,125, 2,8,189, 3,1,207, 3,2,205, 3,3,189, 3,4,189, 3,5,189, 3,6,189, 3,7,187, 3,8,238, 4,8,205, 5,8,148], secondary: false},
            {width: 7, bonus: 75, chr: "2", pixels: [2,1,119, 2,2,134, 2,7,136, 2,8,255, 3,1,193, 3,6,171, 3,7,122, 3,8,187, 4,1,207, 4,5,173, 4,6,113, 4,8,190, 5,1,191, 5,2,158, 5,3,122, 5,4,213, 5,5,107, 5,8,196, 6,2,119, 6,3,139], secondary: false},
            {width: 7, bonus: 75, chr: "3", pixels: [1,1,116, 1,8,213, 2,1,194, 2,4,131, 2,8,188, 3,1,194, 3,4,195, 3,5,104, 3,8,209, 4,1,88, 4,2,223, 4,3,206, 4,4,120, 4,5,209, 4,6,121, 4,7,179, 4,8,123, 5,2,58, 5,3,62, 5,6,137, 5,7,113], secondary: false},
            {width: 7, bonus: 85, chr: "4", pixels: [1,5,122, 1,6,240, 2,4,204, 2,5,122, 2,6,187, 3,2,127, 3,3,183, 3,6,189, 4,1,191, 4,2,155, 4,6,204, 5,1,190, 5,2,188, 5,3,189, 5,4,189, 5,5,187, 5,6,238, 5,7,187, 5,8,195, 6,6,140], secondary: false},
            {width: 7, bonus: 90, chr: "5", pixels: [2,1,239, 2,2,188, 2,3,190, 2,4,190, 2,8,212, 3,1,188, 3,4,189, 3,8,189, 4,1,193, 4,4,210, 4,8,210, 5,1,157, 5,4,86, 5,5,240, 5,6,187, 5,7,225, 6,5,83],secondary: false},
            {width: 7, bonus: 85, chr: "6", pixels: [1,3,170, 1,4,255, 1,5,255, 1,6,238, 1,7,155, 2,2,202, 2,4,119, 2,7,126, 2,8,193, 3,1,210, 3,4,192, 3,8,190, 4,1,193, 4,4,209, 4,8,194, 5,5,221, 5,6,255, 5,7,187], secondary: false},
            {width: 7, bonus: 60, chr: "7", pixels: [1,1,200, 2,1,190, 2,7,107, 2,8,221, 3,1,190, 3,5,121, 3,6,241, 3,7,155, 4,1,187, 4,3,157, 4,4,226, 4,5,124, 5,1,255, 5,2,187], secondary: false},
            {width: 7, bonus: 95, chr: "8", pixels: [2,2,239, 2,3,222, 2,5,139, 2,6,206, 2,7,223, 2,8,120, 3,1,210, 3,4,207, 3,5,173, 3,8,224, 4,1,188, 4,4,172, 4,8,188, 5,1,224, 5,3,125, 5,4,172, 5,5,208, 5,8,194, 6,2,181, 6,3,163, 6,5,103, 6,6,238, 6,7,239], secondary:false},
            {width: 7, bonus: 85, chr: "9", pixels: [2,2,225, 2,3,187, 2,4,240, 2,8,168, 3,1,210, 3,5,225, 3,8,191, 4,1,189, 4,5,190, 4,8,209, 5,1,193, 5,2,125, 5,5,136, 5,7,184, 5,8,123, 6,2,155, 6,3,238, 6,4,255, 6,5,255, 6,6,187],secondary: false},
            {width: 5, bonus: 45, chr: "?", pixels: [1,1,170, 2,1,255, 2,5,105, 2,6,233, 2,8,255, 3,1,255, 3,4,146, 3,5,183, 4,1,102, 4,2,255, 4,3,221, 4,4,140], secondary: false},
            {width: 7, bonus: 80, chr: "V", pixels: [1,1,255, 1,2,187, 1,3,93, 2,3,153, 2,4,255, 2,5,153, 2,6,75, 3,6,188, 3,7,238, 3,8,120, 4,7,255, 4,8,204, 5,4,205, 5,5,239, 5,6,138, 6,1,170, 6,2,255, 6,3,153], secondary: false},
            {width: 3, bonus: 35, chr: "i", pixels: [1,1,245, 1,3,208, 1,4,221, 1,5,221, 1,6,221, 1,7,221, 1,8,208], secondary: false},
            {width: 6, bonus: 60, chr: "s", pixels: [1,4,206, 1,5,69, 1,7,102, 1,8,119, 2,3,255, 2,5,242, 2,8,255, 3,3,255, 3,5,121, 3,6,121, 3,8,255, 4,3,255, 4,6,241, 4,7,51, 4,8,255, 5,7,103],secondary: false},
        ],
    };

    const color = <ColortTriplet>[255, 255, 255];
    const t = OCR.findChar(buf, visFont, color, 133, 59, 10, 1);
    if (t == null) {
        return -1;
    }

    const line = OCR.readLine(buf, visFont, color, t.x, t.y, true, true);
    const vis = line.text.split(' ')[0];
    if (vis === '???') {
        return -1;
    }

    const i = parseInt(vis, 10);

    return i >= 0 && i <= 9999 ? i : -1;
}

export function start() {
    if (!window.alt1) {
        output.innerText = "You need to run this page in alt1 to capture the screen";
        return;
    }
    if (!alt1.permissionPixel) {
        output.innerText = "Page is not installed as app or capture permission is not enabled";
        return;
    }

    unavailableRunes = [];
    checkedForAvailableRunes = false;
    previousRuneInputs = [];
    suggestion = [0, 1, 2];
    lastVisCalc = [];
    foundBest = false;
    bestProfit = 0;
    bestVis = 0;
    lastDisplaySuggestion = [0, 0, 0, '', '', ''];

    viswaxcalc.lookupPrices().then(function () {
        capture();
        setInterval(capture, alt1.captureInterval);
    });
}

export function toggleImage() {
    this.classList.toggle('disallow-rune');
    disallowedRunes[this.title] = this.classList.contains('disallow-rune');
}

export function showSettings() {
    let mainContent = document.getElementById('main-content');
    mainContent.style.display = 'none';
    let settingsContent = document.getElementById('settings-content');
    settingsContent.style.display = 'block';
    
    let allowedRunes = document.getElementById('allowed-runes');
    allowedRunes.innerHTML = '';
    allowedRunes.style.display = 'flex';
    allowedRunes.style.flexDirection = 'column';

    let row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'row';
    let i = 0;
    for (const runesAvailableImagesKey in runeImages) {
        if (runesAvailableImagesKey == 'None') {
            continue;
        }

        if (i > 0 && i % 4 === 0) {
            allowedRunes.appendChild(row);
            row = document.createElement('div');
            row.style.display = 'flex';
            row.style.flexDirection = 'row';
        }

        let img = new Image();
        img.title = runesAvailableImagesKey;
        img.src = 'data:image/png;base64,' + runeImages[runesAvailableImagesKey].toPngBase64();
        img.onclick = toggleImage;
        if (disallowedRunes.hasOwnProperty(runesAvailableImagesKey) && disallowedRunes[runesAvailableImagesKey] === true) {
            img.classList.add('disallow-rune');
        }
        row.appendChild(img);
        i++;
    }
    allowedRunes.appendChild(row);

    if (calcForProfit) {
        (<HTMLInputElement> document.getElementById('radio-for-profit')).checked = true;
    } else {
        (<HTMLInputElement> document.getElementById('radio-for-vis')).checked = true;
    }
}

export function saveSettings() {
    localStorage.setItem('calc-mode', calcForProfit ? 'profit' : 'vis');
    localStorage.setItem('runes', JSON.stringify(disallowedRunes));
    let mainContent = document.getElementById('main-content');
    mainContent.style.display = 'block';
    let settingsContent = document.getElementById('settings-content');
    settingsContent.style.display = 'none';
}

export function changeMode(mode) {
    calcForProfit = mode;
}

//check if we are running inside alt1 by checking if the alt1 global exists
if (window.alt1) {
	//tell alt1 about the app
	//this makes alt1 show the add app button when running inside the embedded browser
	//also updates app settings if they are changed
	alt1.identifyAppUrl("./appconfig.json");
}

disallowedRunes = JSON.parse(localStorage.getItem('runes') ?? '{}');
calcForProfit = !(localStorage.getItem('calc-mode') === 'vis');