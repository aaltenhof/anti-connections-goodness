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

// ─── Arena / box geometry — scales to the participant's viewport ───────────────
// Called fresh each trial so it always reflects the current window size.
function getArenaDims() {
    // Use most of the available viewport to fill the screen
    const vw = window.innerWidth  || document.documentElement.clientWidth  || 1024;
    const vh = window.innerHeight || document.documentElement.clientHeight || 768;

    // jsPsych adds some chrome (progress bar, button row, instruction text, padding)
    const CHROME_V = 150;

    const arenaW = Math.round(vw * 0.85);
    const arenaH = Math.round((vh - CHROME_V) * 0.92);

    // Box and margin scale proportionally with the arena width
    const scale  = arenaW / 720;           // 720 is the original baseline
    const boxW   = Math.round(85 * scale);
    const boxH   = Math.round(40  * scale);
    const margin = Math.round(28  * scale);

    const corners = [
        { x: margin,              y: margin,              name: 'top-left'     },
        { x: arenaW - boxW - margin, y: margin,              name: 'top-right'    },
        { x: margin,              y: arenaH - boxH - margin, name: 'bottom-left'  },
        { x: arenaW - boxW - margin, y: arenaH - boxH - margin, name: 'bottom-right' }
    ];

    return { arenaW, arenaH, boxW, boxH, margin, corners };
}

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
            <p>In this experiment, you will see a <strong>category description</strong> in the center of the screen and <strong>four words</strong> in the corners. These four words are members of the category.</p>


            <p>On each trial, your job is to drag each word toward the category label to show <strong>how well it fits the category</strong>. Specifcally, you should think about how well this description applies to each word. A category description might be better for some words than others. For example, you might think that the category "animals" applies better to "dog" than to "fish."</p>


            <p> Also think about how well the individual words relate to <strong>each other</strong>. For example, you might think that the category "animals" applies better to "dog" and "cat" than "fish." You might also consider "dog" and "cat" as more similar to each other. So in addition to dragging them closer to the category label, you'll want to place them close together.</p>

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

            <div style="margin-top: 24px;">
                <p style="<strong>Your placements also tell us about the relationships between words.</strong></p>
                <p style="text-align: center;">
                    Words you place <strong>near each other</strong> will be treated as more related.<br>
                    Words you place <strong>far apart</strong> will be treated as less related.
                </p>
                <div style="display:flex; gap:20px; margin: 16px 0; text-align:left;">
                    <div style="flex:1; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                        <div style="background:#e74c3c; color:white; padding:8px; font-weight:bold;">Less related</div>
                        <div style="padding:12px;">
                            Placing <em>dog</em> in one corner and <em>cat</em> in the opposite corner
                            suggests they feel <strong>less related</strong> within this category.
                        </div>
                    </div>
                    <div style="flex:1; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                        <div style="background:#27ae60; color:white; padding:8px; font-weight:bold;">More related</div>
                        <div style="padding:12px">
                            Placing <em>dog</em> and <em>cat</em> close together
                            suggests they feel <strong>more related</strong> to each other within this category.
                        </div>
                    </div>
                </div>
            </div>

            <p>You must move <strong>all four words</strong> at least once before you can continue.</p>
            <p>You can reposition words as many times as you like before clicking Continue.</p>

            <p>You will do a practice trial first to get a better sense of how the task works.</p>

            <p><strong>Press any key when you're ready to begin.</strong></p>
        </div>
    `,
    data: { trial_type: 'instructions' }
};

const practiceTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => buildArenaHTML(
        { category_response: 'animal' },
        [
            { word: 'dog',  cornerIndex: 0, cornerName: 'top-left'     },
            { word: 'cat',  cornerIndex: 1, cornerName: 'top-right'    },
            { word: 'fish', cornerIndex: 2, cornerName: 'bottom-left'  },
            { word: 'bird', cornerIndex: 3, cornerName: 'bottom-right' }
        ]
    ),
    choices: ['Continue'],
    button_html: '<button class="jspsych-btn" id="jspsych-continue-btn" disabled>%choice%</button>',
    on_load: function() {
        // Request fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        }
        // Set up drag logic
        setupDragLogic();
    },
    data: {
        custom_trial_type: 'drag_rating',
        trial_type:        'practice',
        trial_number:      0,
        participant_id:    participant_id,
        word1: 'dog', word2: 'cat', word3: 'fish', word4: 'bird',
        category_response: 'animal'
    },
    on_finish: function(data) {
        const coords = getWordCoordinates();
        data.word1_x = coords['dog']?.x  ?? null;
        data.word1_y = coords['dog']?.y  ?? null;
        data.word2_x = coords['cat']?.x  ?? null;
        data.word2_y = coords['cat']?.y  ?? null;
        data.word3_x = coords['fish']?.x ?? null;
        data.word3_y = coords['fish']?.y ?? null;
        data.word4_x = coords['bird']?.x ?? null;
        data.word4_y = coords['bird']?.y ?? null;
        const dims = getArenaDims();
        data.arena_w = dims.arenaW;
        data.arena_h = dims.arenaH;
    }
};

// ─── Begin Main Study ─────────────────────────────────────────────────────────
const beginMainStudy = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div style="max-width: 700px; margin: 0 auto; text-align: center; font-family: sans-serif;">
            <h2>Ready to Begin</h2>
            <p style="font-size: 16px; line-height: 1.6;">
                Great job! You've completed the practice trial.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                You're now ready to begin the main study. The task will be exactly the same:
                drag each word to show how well it fits the category, and place related words near each other.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
                <strong>Click Continue when you're ready to start.</strong>
            </p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'begin_main_study' }
};

// ─── Drag-and-drop arena HTML builder ────────────────────────────────────────
function buildArenaHTML(item, wordCornerAssignments) {
    const { arenaW, arenaH, boxW, boxH, corners } = getArenaDims();

    const wordDivs = wordCornerAssignments.map((wc, i) => {
        const c = corners[wc.cornerIndex];
        return `
            <div class="word-box"
                 data-word="${wc.word}"
                 data-index="${i}"
                 data-corner="${wc.cornerName}"
                 style="left:${c.x}px; top:${c.y}px; width:${boxW}px; height:${boxH}px;">
                ${wc.word}
            </div>`;
    }).join('');

    return `
        <style>
            * {
                box-sizing: border-box;
            }
            body, html {
                margin: 0;
                padding: 0;
                width: 100%;
            }
            .jspsych-content-wrapper, .jspsych-content {
                width: 100%;
                padding: 0;
                margin: 0;
            }
            #drag-arena {
                position: relative;
                width: ${arenaW}px;
                height: ${arenaH}px;
                border: 2px solid #ccc;
                border-radius: 12px;
                margin: 0 auto;
                background: #f9f9f9;
                overflow: hidden;
                display: block;
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

        <div style="text-align:center; font-family:sans-serif; margin:0 auto;">
            <p style="font-size:14px; color:#555; margin-bottom:10px;">
                Drag each word toward the category — <strong>closer to the category = better fit</strong>.
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

    const boxes       = arena.querySelectorAll('.word-box');
    const movedSet    = new Set();
    const continueBtn = document.getElementById('jspsych-continue-btn');

    if (continueBtn) continueBtn.disabled = true;

    // ── Reposition boxes using actual rendered arena size ──────────────────
    const actualW = arena.offsetWidth;
    const actualH = arena.offsetHeight;
    const { margin } = getArenaDims();
    const boxW = boxes[0].offsetWidth;
    const boxH = boxes[0].offsetHeight;

    const actualCorners = [
        { name: 'top-left',     x: margin,                  y: margin                  },
        { name: 'top-right',    x: actualW - boxW - margin,  y: margin                  },
        { name: 'bottom-left',  x: margin,                  y: actualH - boxH - margin  },
        { name: 'bottom-right', x: actualW - boxW - margin,  y: actualH - boxH - margin  }
    ];

    boxes.forEach(box => {
        const corner = actualCorners.find(c => c.name === box.dataset.corner);
        if (corner) {
            box.style.left = corner.x + 'px';
            box.style.top  = corner.y + 'px';
        }
    });

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

// ─── Coordinate extraction (called from on_finish) ───────────────────────────
// Returns an object keyed by word → {x, y} coordinates (center of each word box)
function getWordCoordinates() {
    const arena = document.getElementById('drag-arena');
    if (!arena) return {};

    const coordinates = {};
    arena.querySelectorAll('.word-box').forEach(box => {
        // Get center coordinates of the word box
        const boxCX = parseInt(box.style.left, 10) + box.offsetWidth  / 2;
        const boxCY = parseInt(box.style.top,  10) + box.offsetHeight / 2;

        coordinates[box.dataset.word] = {
            x: Math.round(boxCX),
            y: Math.round(boxCY)
        };
    });

    return coordinates;
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
            cornerName:  ['top-left','top-right','bottom-left','bottom-right'][cornerOrder[i]]
        }));

        const trialNum = globalTrialNumber; // capture for closure

        const dragTrial = {
            type: jsPsychHtmlButtonResponse,
            stimulus: () => buildArenaHTML(item, wordCornerAssignments),
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
                ),
                viewport_w: window.innerWidth  || null,
                viewport_h: window.innerHeight || null
            },
            on_finish: function(data) {
                const coords = getWordCoordinates();
                data.word1_x = coords[item.word1]?.x ?? null;
                data.word1_y = coords[item.word1]?.y ?? null;
                data.word2_x = coords[item.word2]?.x ?? null;
                data.word2_y = coords[item.word2]?.y ?? null;
                data.word3_x = coords[item.word3]?.x ?? null;
                data.word3_y = coords[item.word3]?.y ?? null;
                data.word4_x = coords[item.word4]?.x ?? null;
                data.word4_y = coords[item.word4]?.y ?? null;
                // Record arena size used for this trial
                const dims = getArenaDims();
                data.arena_w = dims.arenaW;
                data.arena_h = dims.arenaH;
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
               'difficulty,consensus,word1_x,word1_y,word2_x,word2_y,word3_x,word3_y,word4_x,word4_y,' +
               'rt,word_corner_assignments,viewport_w,viewport_h,arena_w,arena_h\n';
    }

    try {
        const header = [
            'subjCode', 'trial_num', 'group_id', 'condition',
            'word1', 'word2', 'word3', 'word4', 'category_response',
            'difficulty', 'consensus',
            'word1_x', 'word1_y', 'word2_x', 'word2_y', 'word3_x', 'word3_y', 'word4_x', 'word4_y',
            'rt', 'word_corner_assignments', 'viewport_w', 'viewport_h', 'arena_w', 'arena_h'
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
                trial.word1_x             ?? '',
                trial.word1_y             ?? '',
                trial.word2_x             ?? '',
                trial.word2_y             ?? '',
                trial.word3_x             ?? '',
                trial.word3_y             ?? '',
                trial.word4_x             ?? '',
                trial.word4_y             ?? '',
                Math.round(trial.rt       || 0),
                trial.word_corner_assignments || '',
                trial.viewport_w          ?? '',
                trial.viewport_h          ?? '',
                trial.arena_w             ?? '',
                trial.arena_h             ?? ''
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
    experiment_id: 'h7Akr3tdxQkz',
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
            let qualtricsUrl = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_eepKyHQe2PLiZ8O`;
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
            practiceTrial,
            beginMainStudy,
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
