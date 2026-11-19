const DATAPIPE_ID = 'LYyAAuFf1eXU';
const QUALTRICS_URL = 'https://uwmadison.co1.qualtrics.com/jfe/form/SV_3Ktx5PstjcDQCDc';

function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const sonaId = getUrlParam('sona_id');
const workerId = getUrlParam('workerId');

const jsPsych = initJsPsych({
    show_progress_bar: true
});

let participant_id;
if (sonaId) {
    participant_id = sonaId;
    console.log('Using SONA ID:', participant_id);
} else if (workerId) {
    participant_id = workerId;
    console.log('Using MTurk Worker ID:', participant_id);
} else {
    participant_id = `participant_${jsPsych.randomization.randomID(8)}`;
    console.log('No worker ID found, using random ID:', participant_id);
}

let timeline = [];
let trialList = null;  // 1-21, set from the DataPipe condition

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

            <p>If you are not satisfied with response of the research team, have more questions, or want to talk with someone about your rights as a research participant, you should contact University of Wisconsin's Education Research and Social & Behavioral Science IRB Office at 608-263-2320.</p>

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

const instructions = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div style="max-width: 750px; margin: 0 auto; text-align: center;">
            <h2>Instructions</h2>
            <p>In this experiment, you will see a series of category descriptions.</p>
            <p>For each one, think of <strong>four things that belong to the category</strong> and type them into the boxes.</p>
            <p>Each answer should be a <strong>single-word noun</strong>: a person, place, or thing, such as <em>teacher</em>, <em>park</em>, or <em>umbrella</em>. Please don't use phrases like <em>big dog</em>, and use four different words.</p>
            <div style="border: 1px solid #ddd; border-radius: 5px; overflow: hidden; max-width: 520px; margin: 25px auto; text-align: left;">
                <div style="background-color: #27ae60; color: white; padding: 8px; font-weight: bold;">Example</div>
                <div style="padding: 12px;">
                    <p><strong>Category:</strong> "Things you might pack for a day at the beach"</p>
                    <p><strong>Answers:</strong> towel &nbsp;&bull;&nbsp; sunscreen &nbsp;&bull;&nbsp; umbrella &nbsp;&bull;&nbsp; cooler</p>
                </div>
            </div>
            <p>There are no right or wrong answers. Just go with what comes to mind.</p>
            <p>You'll start with one practice round.</p>
        </div>
    `,
    choices: ['Start practice'],
    data: { trial_type: 'instructions' }
};

const start_main = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div style="max-width: 700px; margin: 0 auto; text-align: center;">
            <h2>Great!</h2>
            <p>Now you'll begin the main task. Remember: four different single-word nouns (people, places, or things) for each category.</p>
        </div>
    `,
    choices: ['Begin'],
    data: { trial_type: 'instructions' }
};

// --- exemplar-generation trial -------------------------------------------

const SINGLE_WORD = /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/;  // letters; allows t-shirt, o'clock

function exemplarHTML(category) {
    const inputs = [1, 2, 3, 4].map(i =>
        `<input type="text" id="ex${i}" name="exemplar${i}" autocomplete="off"
                autocapitalize="off" maxlength="40" placeholder="Word ${i}" required>`
    ).join('');
    return `
        <div style="text-align: center;">
            <p style="margin-bottom: 5px; color: #666;">Category:</p>
            <div class="category-box">"${category}"</div>
            <p><strong>Type four things that belong to this category.</strong></p>
            <div class="exemplar-grid">${inputs}</div>
            <div class="exemplar-error" id="exemplar-error"></div>
        </div>
    `;
}

// live validation: single word, no repeats within the trial
function attachValidation() {
    const inputs = [1, 2, 3, 4].map(i => document.getElementById(`ex${i}`));
    const errorBox = document.getElementById('exemplar-error');

    const validate = () => {
        const vals = inputs.map(el => el.value.trim().toLowerCase());
        let message = '';
        inputs.forEach((el, i) => {
            let msg = '';
            if (vals[i] && !SINGLE_WORD.test(vals[i])) {
                msg = 'Please enter a single word (letters only, no spaces).';
            } else if (vals[i] && vals.indexOf(vals[i]) !== i) {
                msg = 'Please use four different words.';
            }
            el.setCustomValidity(msg);
            el.classList.toggle('invalid', msg !== '');
            if (msg && !message) message = msg;
        });
        errorBox.textContent = message;
    };

    inputs.forEach(el => el.addEventListener('input', validate));
}

function makeExemplarTrial(item, trialNumber, isPractice) {
    return {
        type: jsPsychSurveyHtmlForm,
        html: exemplarHTML(item.category_response),
        autofocus: 'ex1',
        button_label: 'Continue',
        on_load: attachValidation,
        data: {
            custom_trial_type: isPractice ? 'practice' : 'exemplar_generation',
            trial_number: trialNumber,
            participant_id: participant_id,
            category_id: item.category_id,
            group_id: item.group_id,
            subject_type: item.subject_type,
            word1: item.word1,
            word2: item.word2,
            word3: item.word3,
            word4: item.word4,
            category_response: item.category_response
        },
        on_finish: function(data) {
            [1, 2, 3, 4].forEach(i => {
                data[`exemplar${i}`] = (data.response[`exemplar${i}`] || '').trim();
            });
            data.trial_list = trialList;
        }
    };
}

const practiceTrial = makeExemplarTrial({
    category_id: 'practice',
    group_id: 'practice',
    subject_type: 'practice',
    word1: '', word2: '', word3: '', word4: '',
    category_response: 'Animals you might see on a farm'
}, 0, true);

function createTrials(trialsData) {
    return trialsData.map((item, i) => makeExemplarTrial(item, i + 1, false));
}

// --- data saving -----------------------------------------------------------

const DATA_COLUMNS = ['subjCode', 'trial_list', 'trial_num', 'category_id', 'group_id', 'subject_type',
    'word1', 'word2', 'word3', 'word4', 'category_response',
    'exemplar1', 'exemplar2', 'exemplar3', 'exemplar4', 'rt'];

function getFilteredData() {
    const trials = jsPsych.data.get()
        .filter([{ custom_trial_type: 'practice' }, { custom_trial_type: 'exemplar_generation' }])
        .values();

    const rows = trials.map(t => ({
        subjCode: t.participant_id,
        trial_list: t.trial_list,
        trial_num: t.trial_number,
        category_id: t.category_id,
        group_id: t.group_id,
        subject_type: t.subject_type,
        word1: t.word1, word2: t.word2, word3: t.word3, word4: t.word4,
        category_response: t.category_response,
        exemplar1: t.exemplar1, exemplar2: t.exemplar2,
        exemplar3: t.exemplar3, exemplar4: t.exemplar4,
        rt: Math.round(t.rt || 0)
    }));

    // Papa handles quoting of commas, quotes and newlines
    return Papa.unparse({ fields: DATA_COLUMNS, data: rows.map(r => DATA_COLUMNS.map(c => r[c] ?? '')) });
}

const save_data = {
    type: jsPsychPipe,
    action: 'save',
    experiment_id: DATAPIPE_ID,
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

// --- trial list loading ----------------------------------------------------

async function loadTrials(datapipe_condition) {
    try {
        trialList = datapipe_condition + 1;  // conditions 0-20 -> file1-file21
        const response = await fetch(`trial_lists/file${trialList}.csv`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });
        console.log(`Loaded ${results.data.length} trials from file${trialList}.csv`);
        return jsPsych.randomization.shuffle([...results.data]);
    } catch (error) {
        console.error('Error loading trials:', error);
        return [];
    }
}

const final_screen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div style="text-align: center; max-width: 600px; margin: 0 auto;">
            <h2>Thank you!</h2>
            <p>You have completed the experiment! Now you will complete a brief survey.</p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'final' },
    on_finish: function() {
        setTimeout(function() {
            let qualtricsUrl = QUALTRICS_URL;
            if (sonaId) {
                qualtricsUrl += `?sona_id=${encodeURIComponent(sonaId)}`;
            }
            window.location.href = qualtricsUrl;
        }, 100);
    }
};

async function runExperiment() {
    try {
        console.log('Participant ID:', participant_id);

        const datapipe_condition = await jsPsychPipe.getCondition(DATAPIPE_ID);
        console.log('Assigned condition:', datapipe_condition);
        const trialsData = await loadTrials(datapipe_condition);

        if (trialsData.length === 0) {
            throw new Error('No trials loaded');
        }

        timeline = [
            consent,
            instructions,
            practiceTrial,
            start_main,
            ...createTrials(trialsData),
            save_data,
            final_screen
        ];

        jsPsych.run(timeline);

    } catch (error) {
        console.error('Error running experiment:', error);
        document.body.innerHTML = `
            <div style="max-width: 800px; margin: 50px auto; padding: 20px; background: #f8f8f8; border-radius: 5px; text-align: center;">
                <h2>Error Starting Experiment</h2>
                <p>There was a problem starting the experiment. Please try refreshing the page.</p>
                <p>If the problem persists, please contact the researcher.</p>
                <p>Technical details: ${error.message}</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', runExperiment);
