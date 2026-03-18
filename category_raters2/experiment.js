function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const sonaId = getUrlParam('sona_id');
const workerId = getUrlParam('workerId');

let participant_id;
if (sonaId) {
    participant_id = sonaId;
    console.log('Using SONA ID:', participant_id);
} else if (workerId) {
    participant_id = workerId;
    console.log('Using MTurk Worker ID:', participant_id);
} else {
    participant_id = `participant${Math.floor(Math.random() * 999) + 1}`;
    console.log('No worker ID found, using random ID:', participant_id);
}

const jsPsych = initJsPsych({
    show_progress_bar: true,
    on_finish: function() {}
});

let timeline = [];
let globalTrialNumber = 0;

// ─── Arena / box geometry ─────────────────────────────────────────────────────
const ARENA_W = 720;
const ARENA_H = 500;
const BOX_W   = 130;
const BOX_H   = 55;
const MARGIN  = 28;

// Fixed corner positions (top-left, top-right, bottom-left, bottom-right)
const CORNERS = [
    { x: MARGIN,                    y: MARGIN,                    name: 'top-left'     },
    { x: ARENA_W - BOX_W - MARGIN,  y: MARGIN,                    name: 'top-right'    },
    { x: MARGIN,                    y: ARENA_H - BOX_H - MARGIN,  name: 'bottom-left'  },
    { x: ARENA_W - BOX_W - MARGIN,  y: ARENA_H - BOX_H - MARGIN,  name: 'bottom-right' }
];

// ─── Consent ──────────────────────────────────────────────────────────────────
const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="consent-text">
            <h3>Consent to Participate in Research</h3>

            <p>The task you are about to do is sponsored by University of Wisconsin-Madison. It is part of a protocol titled "What are we learning from language?"</p>

            <p>The task you are asked to do involves making simple responses to words and sentences. For example, you may be asked to rate a pair of words on their similarity or to indicate how true you think a given sentence is. More detailed instructions for this specific task will be provided on the next screen.</p>

            <p>This task has no direct benefits. We do not anticipate any psychosocial risks. There is a risk of a confidentiality breach. Participants may become fatigued or frustrated due to the length of the study.</p>

            <p>The responses you submit as part of this task will be stored on a secure server and accessible only to researchers who have been approved by UW-Madison. Processed data with all identifiers removed could be used for future research studies or distributed to another investigator for future research studies without additional informed consent from the subject or the legally authorized representative.</p>

            <p>You are free to decline to participate, to end participation at any time for any reason, or to refuse to answer any individual question without penalty or loss of earned compensation. We will not retain data from partial responses. If you would like to withdraw your data after participating, you may send an email lupyan@wisc.edu or complete this form which will allow you to make a request anonymously.</p>

            <p>If you have any questions or concerns about this task please contact the principal investigator: Prof. Gary Lupyan at lupyan@wisc.edu.</p>

            <p>If you are not satisfied with response of the research team, have more questions, or want to talk with someone about your rights as a research participant, you should contact University of Wisconsin's Education Research and Social &amp; Behavioral Science IRB Office at 608-263-2320.</p>

            <p><strong>By clicking the box below, I consent to participate in this task and affirm that I am at least 18 years old.</strong></p>
        </div>
    `,
    choices: ['I Agree', 'I Do Not Agree'],
    data: { trial_type: 'consent' },
    on_finish: function(data) {
        if (data.response == 1) {
            jsPsych.endExperiment('Thank you for your time. The experiment has been ended.');
        }
    }
};

// ─── Instructions ─────────────────────────────────────────────────────────────
const instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <div style="max-width: 800px; margin: 0 auto; text-align: center; font-family: sans-serif;">
            <h2>Instructions</h2>
            <p>In this experiment, you will see a <strong>category description</strong> in the center of the screen and <strong>four words</strong> in the corners.</p>

            <p>Your job is to drag each word toward the category label to show <strong>how well it fits</strong>.</p>

            <div style="display:flex; gap:20px; margin: 20px 0; text-align:left;">
                <div style="flex:1; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                    <div style="background:#e74c3c; color:white; padding:8px; font-weight:bold;">Far from center</div>
                    <div style="padding:12px;">The word fits <strong>poorly</strong> — drag it far from the category label.</div>
                </div>
                <div style="flex:1; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                    <div style="background:#27ae60; color:white; padding:8px; font-weight:bold;">Close to center</div>
                    <div style="padding:12px;">The word fits <strong>well</strong> — drag it close to or on top of the category label.</div>
                </div>
            </div>

            <p>You must move <strong>all four words</strong> at least once before you can continue.</p>
            <p>You can reposition words as many times as you like before clicking Continue.</p>

            <p><strong>Press any key when you're ready to begin.</strong></p>
        </div>
    `,
    data: { trial_type: 'instructions' }
};

// ─── Drag-and-drop arena HTML builder ────────────────────────────────────────
function buildArenaHTML(item, wordCornerAssignments) {
    const wordDivs = wordCornerAssignments.map((wc, i) => {
        const c = CORNERS[wc.cornerIndex];
        return `
            <div class="word-box"
                 data-word="${wc.word}"
                 data-index="${i}"
                 data-corner="${wc.cornerName}"
                 style="left:${c.x}px; top:${c.y}px; width:${BOX_W}px; height:${BOX_H}px;">
                ${wc.word}
            </div>`;
    }).join('');

    return `
        <style>
            #drag-arena {
                position: relative;
                width: ${ARENA_W}px;
                height: ${ARENA_H}px;
                border: 2px solid #ccc;
                border-radius: 12px;
                margin: 0 auto;
                background: #f9f9f9;
                overflow: hidden;
            }
            .arena-line-v {
                position: absolute;
                left: 50%; top: 0; bottom: 0;
                width: 1px;
                background: rgba(0,0,0,0.07);
                pointer-events: none;
            }
            .arena-line-h {
                position: absolute;
                top: 50%; left: 0; right: 0;
                height: 1px;
                background: rgba(0,0,0,0.07);
                pointer-events: none;
            }
            #category-label {
                position: absolute;
                left: 50%; top: 50%;
                transform: translate(-50%, -50%);
                background: #3498db;
                color: white;
                padding: 14px 22px;
                border-radius: 10px;
                font-size: 17px;
                font-weight: bold;
                text-align: center;
                max-width: 270px;
                z-index: 1;
                pointer-events: none;
                box-shadow: 0 2px 10px rgba(52,152,219,0.45);
            }
            .word-box {
                position: absolute;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                border: 2px solid #aaa;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                font-family: sans-serif;
                cursor: grab;
                user-select: none;
                z-index: 10;
                box-shadow: 0 2px 6px rgba(0,0,0,0.13);
                touch-action: none;
            }
            .word-box:hover {
                border-color: #3498db;
            }
            .word-box.moved {
                border-color: #27ae60;
            }
            .word-box.dragging {
                cursor: grabbing;
                box-shadow: 0 6px 18px rgba(0,0,0,0.22);
                z-index: 100;
            }
            #continue-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
        </style>

        <div style="text-align:center; font-family:sans-serif; max-width:${ARENA_W}px; margin:0 auto;">
            <p style="font-size:14px; color:#555; margin-bottom:10px;">
                Drag each word toward the category — <strong>closer = better fit</strong>.
            </p>

            <div id="drag-arena">
                <div class="arena-line-v"></div>
                <div class="arena-line-h"></div>
                <div id="category-label">&ldquo;${item.category_response}&rdquo;</div>
                ${wordDivs}
            </div>

            <p style="color:#999; font-size:13px; margin-top:10px;">
                Words moved: <span id="moved-num">0</span> / 4
            </p>
        </div>
    `;
}

// ─── Drag logic (called from on_load) ────────────────────────────────────────
function setupDragLogic() {
    const arena = document.getElementById('drag-arena');
    if (!arena) return;

    const boxes     = arena.querySelectorAll('.word-box');
    const movedSet  = new Set();
    const continueBtn = document.getElementById('jspsych-continue-btn');

    if (continueBtn) continueBtn.disabled = true;

    boxes.forEach(box => {
        let isDragging    = false;
        let startPtrX, startPtrY, startLeft, startTop;

        box.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            isDragging = true;
            box.setPointerCapture(e.pointerId);

            startPtrX  = e.clientX;
            startPtrY  = e.clientY;
            startLeft  = parseInt(box.style.left,  10);
            startTop   = parseInt(box.style.top,   10);

            box.classList.add('dragging');
        });

        box.addEventListener('pointermove', (e) => {
            if (!isDragging) return;

            const arenaW = arena.offsetWidth;
            const arenaH = arena.offsetHeight;
            const boxW   = box.offsetWidth;
            const boxH   = box.offsetHeight;

            const rawLeft = startLeft + (e.clientX - startPtrX);
            const rawTop  = startTop  + (e.clientY - startPtrY);

            // Clamp to arena bounds
            box.style.left = Math.max(0, Math.min(arenaW - boxW, rawLeft)) + 'px';
            box.style.top  = Math.max(0, Math.min(arenaH - boxH, rawTop))  + 'px';
        });

        box.addEventListener('pointerup', () => {
            if (!isDragging) return;
            isDragging = false;

            box.classList.remove('dragging');
            box.classList.add('moved');

            movedSet.add(box.dataset.index);
            document.getElementById('moved-num').textContent = movedSet.size;

            if (movedSet.size === 4 && continueBtn) {
                continueBtn.disabled = false;
            }
        });
    });
}

// ─── Score extraction (called from on_finish) ─────────────────────────────────
// Returns an object keyed by word → score 0–100 (100 = on top of center)
function getWordScores() {
    const arena = document.getElementById('drag-arena');
    if (!arena) return {};

    const arenaW  = arena.offsetWidth;
    const arenaH  = arena.offsetHeight;
    const centerX = arenaW / 2;
    const centerY = arenaH / 2;

    // Maximum possible distance: center → corner
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const scores = {};
    arena.querySelectorAll('.word-box').forEach(box => {
        const boxCX = parseInt(box.style.left, 10) + box.offsetWidth  / 2;
        const boxCY = parseInt(box.style.top,  10) + box.offsetHeight / 2;
        const dist  = Math.sqrt(Math.pow(boxCX - centerX, 2) + Math.pow(boxCY - centerY, 2));

        scores[box.dataset.word] = Math.round((1 - Math.min(dist, maxDist) / maxDist) * 100);
    });

    return scores;
}

// ─── Trial factory ────────────────────────────────────────────────────────────
function createTrials(trialsData) {
    const experimentTrials = [];

    trialsData.forEach((item) => {
        globalTrialNumber++;

        // Randomly assign each word to one of the four corners
        const words       = [item.word1, item.word2, item.word3, item.word4];
        const cornerOrder = jsPsych.randomization.shuffle([0, 1, 2, 3]);
        const wordCornerAssignments = words.map((word, i) => ({
            word,
            cornerIndex: cornerOrder[i],
            cornerName:  CORNERS[cornerOrder[i]].name
        }));

        const trialNum = globalTrialNumber; // capture for closure

        const dragTrial = {
            type: jsPsychHtmlButtonResponse,
            stimulus: buildArenaHTML(item, wordCornerAssignments),
            choices: ['Continue'],
            button_html: '<button class="jspsych-btn" id="jspsych-continue-btn" disabled>%choice%</button>',
            on_load: setupDragLogic,
            data: {
                custom_trial_type:      'drag_rating',
                trial_number:           trialNum,
                participant_id:         participant_id,
                group_id:               item.group_id,
                word1:                  item.word1,
                word2:                  item.word2,
                word3:                  item.word3,
                word4:                  item.word4,
                category_response:      item.category_response,
                condition:              item.condition,
                difficulty:             item.difficulty,
                consensus:              item.consensus,
                word_corner_assignments: JSON.stringify(
                    wordCornerAssignments.map(wc => ({ word: wc.word, corner: wc.cornerName }))
                )
            },
            on_finish: function(data) {
                const scores     = getWordScores();
                data.word1_score = scores[item.word1] ?? null;
                data.word2_score = scores[item.word2] ?? null;
                data.word3_score = scores[item.word3] ?? null;
                data.word4_score = scores[item.word4] ?? null;
            }
        };

        experimentTrials.push(dragTrial);
    });

    return experimentTrials;
}

// ─── Data export ──────────────────────────────────────────────────────────────
function getFilteredData() {
    const dragTrials = jsPsych.data.get()
        .filter({ custom_trial_type: 'drag_rating' })
        .values();

    if (dragTrials.length === 0) {
        console.warn('No drag trials found for saving!');
        return 'subjCode,trial_num,group_id,condition,word1,word2,word3,word4,category_response,' +
               'difficulty,consensus,word1_score,word2_score,word3_score,word4_score,rt,word_corner_assignments\n';
    }

    try {
        const header = [
            'subjCode', 'trial_num', 'group_id', 'condition',
            'word1', 'word2', 'word3', 'word4', 'category_response',
            'difficulty', 'consensus',
            'word1_score', 'word2_score', 'word3_score', 'word4_score',
            'rt', 'word_corner_assignments'
        ].join(',');

        const rows = dragTrials.map(trial => {
            const row = [
                trial.participant_id      || participant_id,
                trial.trial_number        ?? 'NA',
                trial.group_id            ?? '',
                trial.condition           ?? '',
                trial.word1               || '',
                trial.word2               || '',
                trial.word3               || '',
                trial.word4               || '',
                trial.category_response   || '',
                trial.difficulty          ?? '',
                trial.consensus           ?? '',
                trial.word1_score         ?? '',
                trial.word2_score         ?? '',
                trial.word3_score         ?? '',
                trial.word4_score         ?? '',
                Math.round(trial.rt       || 0),
                trial.word_corner_assignments || ''
            ];

            return row.map(value => {
                const s = String(value);
                if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                    return `"${s.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
                }
                return s;
            }).join(',');
        });

        return header + '\n' + rows.join('\n');
    } catch (error) {
        console.error('Error in getFilteredData:', error);
        return 'error\n';
    }
}

// ─── Data save ────────────────────────────────────────────────────────────────
var save_data = {
    type: jsPsychPipe,
    action: 'save',
    experiment_id: 'J0scyQ9CDYZD',
    filename: `${participant_id}.csv`,
    data_string: getFilteredData,
    on_finish: function(data) {
        if (data.success) {
            console.log('Data saved successfully!');
        } else {
            console.error('Error saving to DataPipe:', data.message);
        }
    }
};

// ─── Trial loader ─────────────────────────────────────────────────────────────
async function loadTrials(datapipe_condition) {
    try {
        const map_to_file = datapipe_condition + 1;
        const response = await fetch(`trial_lists/file${map_to_file}.csv`);
        console.log('Trial List:', response);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const csvText = await response.text();
        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        console.log(`Loaded ${results.data.length} trials`);
        return jsPsych.randomization.shuffle([...results.data]);
    } catch (error) {
        console.error('Error loading trials:', error);
        return [];
    }
}

// ─── Final screen ─────────────────────────────────────────────────────────────
var final_screen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div style="text-align:center; max-width:600px; margin:0 auto;">
            <h2>Thank you!</h2>
            <p>You have completed the experiment! Now you will complete a brief survey.</p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'final' },
    on_finish: function() {
        setTimeout(function() {
            let qualtricsUrl = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_bCWCCMEZoDiiA3s`;
            if (sonaId) qualtricsUrl += `?sona_id=${sonaId}`;
            window.location.href = qualtricsUrl;
        }, 100);
    }
};

// ─── Run ──────────────────────────────────────────────────────────────────────
async function runExperiment() {
    try {
        console.log('Participant ID:', participant_id);

        const datapipe_condition = await jsPsychPipe.getCondition('J0scyQ9CDYZD');
        console.log('Assigned condition:', datapipe_condition);

        const trialsData = await loadTrials(datapipe_condition);
        if (trialsData.length === 0) throw new Error('No trials loaded');

        const dragTrials = createTrials(trialsData);
        console.log(`Created ${dragTrials.length} drag-and-drop trials`);

        timeline = [
            consent,
            instructions,
            ...dragTrials,
            save_data,
            final_screen
        ];

        jsPsych.run(timeline);

    } catch (error) {
        console.error('Error running experiment:', error);
        document.body.innerHTML = `
            <div style="max-width:800px; margin:50px auto; padding:20px; background:#f8f8f8;
                        border-radius:5px; text-align:center;">
                <h2>Error Starting Experiment</h2>
                <p>There was a problem starting the experiment. Please try refreshing the page.</p>
                <p>If the problem persists, please contact the researcher.</p>
                <p>Technical details: ${error.message}</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', runExperiment);
