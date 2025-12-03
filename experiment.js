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

const filename = `${participant_id}.csv`;

const jsPsych = initJsPsych({
    show_progress_bar: true,
    on_finish: function() {
    }
});

let timeline = [];
let globalTrialNumber = 0;

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
    data: {
        trial_type: 'consent'
    },
    on_finish: function(data) {
        if(data.response == 1) { // if 'I Do Not Agree'
            jsPsych.endExperiment('Thank you for your time. The experiment has been ended.');
        }
    }
};

const instructions = {
    type: jsPsychHtmlKeyboardResponse,  
    stimulus: `
        <div style="max-width: 800px; margin: 0 auto; text-align: center;">
            <h2>Instructions</h2>
            <p>In this experiment, you will see four words and a category description that someone created to group those words together.</p>
            <p>Your task is to determine how good that description is for the given words. Specifcally, you'll rate: </p>
            <ol style="text-align: left; display: inline-block;">
                <li><strong>Applicability:</strong> How well does this description apply to all four words?
                    <p style="font-weight: normal; margin: 5px 0 15px 0;">A category description might be better for some words than others. A more applicable description will describe all the words in the set. </p>
                    <div style="display: flex; gap: 20px; margin: 15px 0 25px 0;">
                        <div style="flex: 1; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                            <div style="background-color: #e74c3c; color: white; padding: 8px; font-weight: bold;">Less Applicable Example</div>
                            <div style="padding: 12px; font-weight: normal;">
                                <p><strong>Words:</strong> shoe, trowel, rope, lantern</p>
                                <p><strong>Category:</strong> "Things you can burn your hand on"</p>
                                <p><strong>Why it's less applicable:</strong> This description doesn't work well for all four words—you could burn your hand on a lantern or using a rope, but not on a shoe or a trowel.</p>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                            <div style="background-color: #27ae60; color: white; padding: 8px; font-weight: bold;">More Applicable Example</div>
                            <div style="padding: 12px; font-weight: normal;">
                                <p><strong>Words:</strong> shoe, trowel, rope, lantern</p>
                                <p><strong>Category:</strong> "Things that might get lost during a camping trip"</p>
                                <p><strong>Why it's more applicable:</strong> This description applies well to all four words—each item could plausibly be lost while camping.</p>
                            </div>
                        </div>
                    </div>
                </li>
                <li><strong>Specificity:</strong> How specific is this description to the words?
                    <p style="font-weight: normal; margin: 5px 0 15px 0;">Category descriptions can be broad or narrow. A more specific description only includes the items listed, and not any others.</p>
                    <div style="display: flex; gap: 20px; margin: 15px 0 25px 0;">
                        <div style="flex: 1; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                            <div style="background-color: #e74c3c; color: white; padding: 8px; font-weight: bold;">Less Specific Example</div>
                            <div style="padding: 12px; font-weight: normal;">
                                <p><strong>Words:</strong> apple, orange, cheese, yogurt</p>
                                <p><strong>Category:</strong> "Things you can eat"</p>
                                <p><strong>Why it's less specific:</strong> While true, this description is too general; it could apply to lots of other words.</p>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                            <div style="background-color: #27ae60; color: white; padding: 8px; font-weight: bold;">More Specific Example</div>
                            <div style="padding: 12px; font-weight: normal;">
                                <p><strong>Words:</strong> apple, orange, cheese, yogurt</p>
                                <p><strong>Category:</strong> "Snacks you might find in a child's lunch box"</p>
                                <p><strong>Why it's more specific:</strong> This description has a more specific context that excludes lots of similar words.</p>
                            </div>
                        </div>
                    </div>
                </li>
            </ol>
            <p><strong>Press any key when you're ready to begin.</strong></p>
        </div>
    `,
    data: {
        trial_type: 'instructions'
    }
};

function createTrials(trialsData) {
    const experimentTrials = [];
    
    trialsData.forEach((item) => {
        globalTrialNumber++;
        
        const displayTrial = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                return `
                    <div style="text-align: center; max-width: 800px; margin: 0 auto;">
                        <h3>Words:</h3>
                        <div style="font-size: 24px; margin: 20px 0; line-height: 1.8;">
                            ${item.word1}<br>
                            ${item.word2}<br>
                            ${item.word3}<br>
                            ${item.word4}
                        </div>
                        <h3>Category:</h3>
                        <div style="font-size: 22px; margin: 20px 0;">
                            "${item.category_response}"
                        </div>
                        <p style="margin-top: 30px; color: #666;">Press any key to continue.</p>
                    </div>
                `;
            },
            data: {
                trial_type: 'display',
                trial_number: globalTrialNumber,
                group_id: item.group_id
            }
        };

        // applicability rating
        const applicabilityTrial = {
            type: jsPsychHtmlSliderResponse,
                stimulus: function() {
                    return `
                        <div style="text-align: center; max-width: 800px; margin: 0 auto;">
                            <div style="font-size: 18px; margin-bottom: 15px; line-height: 1.6;">
                                ${item.word1}<br>${item.word2}<br>${item.word3}<br>${item.word4}
                            </div>
                            <div style="font-size: 16px; margin-bottom: 20px;">
                                "${item.category_response}"
                            </div>
                            <p style="font-size: 20px; margin: 20px 0;"><strong>How well does this description apply to all four words?</strong></p>
                        </div>
                    `;
                },
            labels: [
                '0<br>Not at all<br>applicable', 
                '25<br>Not really all<br>applicable', 
                '50<br>Neutral<br>', 
                '75<br>Moderate;y<br>applicable', 
                '100<br>Perfectly<br>applicable'
            ],
            min: 0,
            max: 100,
            step: 1,
            slider_start: 50,
            require_movement: true,
            button_label: 'Continue',
            data: {
                custom_trial_type: 'applicability_rating',
                trial_number: globalTrialNumber,
                participant_id: participant_id,
                group_id: item.group_id,
                word1: item.word1,
                word2: item.word2,
                word3: item.word3,
                word4: item.word4,
                category_response: item.category_response,
                condition: item.condition,
                difficulty: item.difficulty,
                consensus: item.consensus
            }
        };

        // specificity rating
        const specificityTrial = {
            type: jsPsychHtmlSliderResponse,
            stimulus: function() {
                return `
                    <div style="text-align: center; max-width: 800px; margin: 0 auto;">
                        <div style="font-size: 18px; margin-bottom: 15px; line-height: 1.6;">
                            ${item.word1}<br>${item.word2}<br>${item.word3}<br>${item.word4}
                        </div>
                        <div style="font-size: 16px; margin-bottom: 20px;">
                            "${item.category_response}"
                        </div>
                        <p style="font-size: 20px; margin: 20px 0;"><strong>How specific is this category?</strong></p>
                    </div>
                `;
            },
            labels: [
                '0<br>Very<br>general', 
                '25<br>Moderately<br>general', 
                '50<br>Neutral<br>', 
                '75<br>Moderately<br>specific', 
                '100<br>Very<br>specific'
            ],
            min: 0,
            max: 100,
            step: 1,
            slider_start: 50,
            require_movement: true,
            button_label: 'Continue',
            data: {
                custom_trial_type: 'specificity_rating',
                trial_number: globalTrialNumber,
                participant_id: participant_id,
                group_id: item.group_id,
                word1: item.word1,
                word2: item.word2,
                word3: item.word3,
                word4: item.word4,
                category_response: item.category_response,
                condition: item.condition,
                difficulty: item.difficulty,
                consensus: item.consensus
            }
        };

        experimentTrials.push(displayTrial, applicabilityTrial, specificityTrial);
    });
    
    return experimentTrials;
}

function getFilteredData() {
    const applicabilityTrials = jsPsych.data.get()
        .filter({ custom_trial_type: 'applicability_rating' })
        .values();
    
    const specificityTrials = jsPsych.data.get()
        .filter({ custom_trial_type: 'specificity_rating' })
        .values();

    // create a map of specificity ratings by trial_number
    const specificityMap = new Map();
    specificityTrials.forEach(trial => {
        specificityMap.set(trial.trial_number, {
            response: trial.response,
            rt: trial.rt
        });
    });

    if (applicabilityTrials.length === 0) {
        console.warn("No trials found for saving!");
        return 'subjCode,trial_num,group_id,condition,word1,word2,word3,word4,category_response,difficulty,consensus,applicable,applicable_rt,specific,specific_rt\n';
    }
    
    try {
        const header = 'subjCode,trial_num,group_id,condition,word1,word2,word3,word4,category_response,difficulty,consensus,applicable,applicable_rt,specific,specific_rt';
        const rows = [];
        
        applicabilityTrials.forEach((trial) => {
            const specificityData = specificityMap.get(trial.trial_number) || { response: '', rt: '' };
            
            const row = [
                trial.participant_id || participant_id,
                trial.trial_number || 'NA',
                trial.group_id || '',
                trial.condition ?? '',
                trial.word1 || '',
                trial.word2 || '',
                trial.word3 || '',
                trial.word4 || '',
                trial.category_response || '',
                trial.difficulty ?? '',
                trial.consensus ?? '',
                trial.response || '',  // applicable rating
                Math.round(trial.rt || 0),  // applicable rt
                specificityData.response || '',  // specific rating
                Math.round(specificityData.rt || 0)  // specific rt
            ];
            rows.push(row);
        });
        
        const csvRows = rows.map(row => {
            return row.map(value => {
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
                }
                return value;
            }).join(',');
        });
        
        const finalCSV = header + '\n' + csvRows.join('\n');
        return finalCSV;
    } catch (error) {
        console.error("Error in getFilteredData:", error);
        return 'subjCode,trial_num,group_id,condition,word1,word2,word3,word4,category_response,difficulty,consensus,applicable,applicable_rt,specific,specific_rt\nerror,0,0,0,error,error,error,error,error,0,0,0,0,0,0\n';
    }
}

var save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "J0scyQ9CDYZD", 
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

async function loadTrials() {
    try {
        const response = await fetch('trial_lists/file1.csv'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        console.log(`Loaded ${results.data.length} trials`);
        
        // Shuffle trial order
        let shuffledData = jsPsych.randomization.shuffle([...results.data]);
        
        return shuffledData;
    } catch (error) {
        console.error('Error loading trials:', error);
        return [];
    }
}


var final_screen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
        return `
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h2>Thank you!</h2>
                <p>You have completed the experiment! Now you will complete a brief survey.</p>
            </div>
        `;
    },
    choices: ['Continue'],
    data: {
        trial_type: 'final'
    },  
    on_finish: function() {
        setTimeout(function() {
            // Pass sona_id to Qualtrics as a URL parameter
            let qualtricsUrl = `https://uwmadison.co1.qualtrics.com/jfe/form/YOUR_QUALTRICS_ID_HERE`;  // Replace with your Qualtrics URL
            
            if (sonaId) {
                qualtricsUrl += `?sona_id=${sonaId}`;
            }
            
            window.location.href = qualtricsUrl;
        }, 100);
    }
};


async function runExperiment() {
    try {
        console.log('Participant ID:', participant_id);
        
        const trialsData = await loadTrials();
        
        if (trialsData.length === 0) {
            throw new Error('No trials loaded');
        }
        
        const ratingTrials = createTrials(trialsData);
        console.log(`Created ${ratingTrials.length} trial screens`);

        timeline = [
            consent,
            instructions,
            ...ratingTrials,
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