/*
===========================================================
WORD → WAVE WEBSITE
===========================================================
*/


/*
-----------------------------------------------------------
GET HTML ELEMENTS
-----------------------------------------------------------
*/

const wordInput =
    document.getElementById(
        "wordInput"
    );


const convertButton =
    document.getElementById(
        "convertButton"
    );


const status =
    document.getElementById(
        "status"
    );


const results =
    document.getElementById(
        "results"
    );


const resultTitle =
    document.getElementById(
        "resultTitle"
    );


const resultInfo =
    document.getElementById(
        "resultInfo"
    );


const generatedEquation =
    document.getElementById(
        "generatedEquation"
    );


const lettersContainer =
    document.getElementById(
        "letters"
    );


const parameterTable =
    document.getElementById(
        "parameterTable"
    );


const canvas =
    document.getElementById(
        "waveCanvas"
    );


const playButton =
    document.getElementById(
        "playButton"
    );


const downloadButton =
    document.getElementById(
        "downloadButton"
    );


const copyButton =
    document.getElementById(
        "copyButton"
    );


/*
-----------------------------------------------------------
STATE
-----------------------------------------------------------
*/

let currentAnalysis = null;

let currentSignal = null;

let currentAudio = null;

let currentAudioURL = null;


/*
-----------------------------------------------------------
CONVERT
-----------------------------------------------------------
*/

function convert() {

    const word =
        wordInput.value.trim();


    if (!word) {

        status.textContent =
            "Please enter a word.";

        return;

    }


    /*
    Analyze
    */

    const analysis =
        analyzeWord(
            word
        );


    if (
        analysis.terms.length === 0
    ) {

        status.textContent =
            "Please enter at least one A-Z letter.";

        return;

    }


    status.textContent =
        "Generating waveform...";


    /*
    Stop previous audio
    */

    if (currentAudio) {

        currentAudio.pause();

        currentAudio = null;

    }


    if (currentAudioURL) {

        URL.revokeObjectURL(
            currentAudioURL
        );

        currentAudioURL = null;

    }


    /*
    Save analysis
    */

    currentAnalysis =
        analysis;


    /*
    Render audio
    */

    currentSignal =
        renderWave(
            analysis
        );


    /*
    WAV
    */

    const wav =
        encodeWav(
            currentSignal
        );


    currentAudioURL =
        URL.createObjectURL(
            wav
        );


    /*
    Create audio player
    */

    currentAudio =
        new Audio(
            currentAudioURL
        );


    /*
    Update UI
    */

    resultTitle.textContent =
        `"${analysis.letters.join("")}"`;


    resultInfo.textContent =
        `${analysis.terms.length} letters · ` +
        `${analysis.duration.toFixed(2)} seconds`;


    renderEquation(
        analysis
    );


    renderLetters(
        analysis
    );


    renderTable(
        analysis
    );


    drawWaveform(
        analysis,
        currentSignal
    );


    /*
    Download button
    */

    downloadButton.href =
        currentAudioURL;


    downloadButton.download =
        makeFilename(
            word
        );


    downloadButton.classList.remove(
        "disabled"
    );


    /*
    Enable buttons
    */

    playButton.disabled =
        false;


    copyButton.disabled =
        false;


    /*
    Show results
    */

    results.classList.remove(
        "hidden"
    );


    status.textContent =
        "Done.";


    /*
    Scroll
    */

    results.scrollIntoView({
        behavior: "smooth"
    });

}


/*
-----------------------------------------------------------
EQUATION
-----------------------------------------------------------
*/

function renderEquation(
    analysis
) {

    generatedEquation.innerHTML =
        "";


    const prefix =
        document.createElement(
            "span"
        );


    prefix.innerHTML =
        "<i>f</i>(t) =";


    generatedEquation.append(
        prefix
    );


    analysis.terms.forEach(
        (term, index) => {

            const termElement =
                document.createElement(
                    "span"
                );


            termElement.className =
                "equation-term";


            termElement.dataset.index =
                term.index;


            termElement.innerHTML = `

                a<sub>${term.index}</sub>(t)

                sin(

                2π·${term.frequency.toFixed(1)}·t

                +

                ${term.phase.toFixed(3)}

                )

            `;


            termElement.addEventListener(
                "mouseenter",
                () => highlight(
                    term.index
                )
            );


            generatedEquation.append(
                termElement
            );


            if (
                index <
                analysis.terms.length - 1
            ) {

                const plus =
                    document.createElement(
                        "span"
                    );


                plus.className =
                    "plus";


                plus.textContent =
                    "+";


                generatedEquation.append(
                    plus
                );

            }

        }
    );

}


/*
-----------------------------------------------------------
LETTER CARDS
-----------------------------------------------------------
*/

function renderLetters(
    analysis
) {

    lettersContainer.innerHTML =
        "";


    analysis.terms.forEach(
        term => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "letter-card";


            card.dataset.index =
                term.index;


            card.innerHTML = `

                <div class="letter">
                    ${term.letter}
                </div>

                <div class="letter-data">

                    <div class="letter-equation">

                        a<sub>${term.index}</sub>(t)
                        ·
                        sin(
                        2π·${term.frequency.toFixed(1)}·t
                        +
                        ${term.phase.toFixed(3)}
                        )

                    </div>

                    <div class="details">

                        <span>
                            value ${term.value}
                        </span>

                        <span>
                            ${term.frequency.toFixed(1)} Hz
                        </span>

                        <span>
                            phase ${term.phase.toFixed(3)}
                        </span>

                        <span>
                            peak ${term.center.toFixed(2)}s
                        </span>

                    </div>

                </div>

            `;


            card.addEventListener(
                "mouseenter",
                () => highlight(
                    term.index
                )
            );


            lettersContainer.append(
                card
            );

        }
    );

}


/*
-----------------------------------------------------------
TABLE
-----------------------------------------------------------
*/

function renderTable(
    analysis
) {

    parameterTable.innerHTML =
        "";


    analysis.terms.forEach(
        term => {

            const row =
                document.createElement(
                    "tr"
                );


            row.dataset.index =
                term.index;


            row.innerHTML = `

                <td>${term.index}</td>

                <td>
                    <strong>
                        ${term.letter}
                    </strong>
                </td>

                <td>${term.value}</td>

                <td>
                    ${term.frequency.toFixed(1)} Hz
                </td>

                <td>
                    ${term.phase.toFixed(3)} rad
                </td>

                <td>
                    ${term.center.toFixed(2)} s
                </td>

                <td>
                    ${term.width.toFixed(2)} s
                </td>

            `;


            row.addEventListener(
                "mouseenter",
                () => highlight(
                    term.index
                )
            );


            parameterTable.append(
                row
            );

        }
    );

}


/*
-----------------------------------------------------------
HIGHLIGHT
-----------------------------------------------------------
*/

function highlight(
    index
) {

    document
        .querySelectorAll(
            "[data-index]"
        )
        .forEach(
            element => {

                element.classList.toggle(
                    "active",
                    element.dataset.index ===
                    String(index)
                );

            }
        );

}


/*
-----------------------------------------------------------
WAVEFORM
-----------------------------------------------------------
*/

function drawWaveform(
    analysis,
    signal
) {

    const width =
        canvas.clientWidth || 900;


    const height =
        260;


    const dpr =
        window.devicePixelRatio || 1;


    canvas.width =
        width * dpr;


    canvas.height =
        height * dpr;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.scale(
        dpr,
        dpr
    );


    /*
    Background
    */

    ctx.fillStyle =
        "#fbfaf6";


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
    Middle line
    */

    ctx.strokeStyle =
        "#d8d2c7";


    ctx.lineWidth = 1;


    ctx.beginPath();


    ctx.moveTo(
        0,
        height / 2
    );


    ctx.lineTo(
        width,
        height / 2
    );


    ctx.stroke();


    /*
    Waveform
    */

    ctx.strokeStyle =
        "#171717";


    ctx.lineWidth =
        1.5;


    ctx.beginPath();


    for (
        let x = 0;
        x < width;
        x++
    ) {

        const index =
            Math.floor(
                (
                    x / width
                ) *
                signal.length
            );


        const sample =
            signal[
                Math.min(
                    index,
                    signal.length - 1
                )
            ];


        const y =
            height / 2 -
            sample *
            height *
            0.40;


        if (x === 0) {

            ctx.moveTo(
                x,
                y
            );

        }

        else {

            ctx.lineTo(
                x,
                y
            );

        }

    }


    ctx.stroke();


    /*
    Letter boundaries
    */

    ctx.strokeStyle =
        "#e4ddd3";


    for (
        const term of analysis.terms
    ) {

        const start =
            Math.max(
                0,
                term.center -
                term.width
            );


        const x =
            (
                start /
                analysis.duration
            ) *
            width;


        ctx.beginPath();


        ctx.moveTo(
            x,
            15
        );


        ctx.lineTo(
            x,
            height - 15
        );


        ctx.stroke();

    }

}


/*
-----------------------------------------------------------
PLAY / PAUSE
-----------------------------------------------------------
*/

playButton.addEventListener(
    "click",
    async () => {

        if (!currentAudio) {

            return;

        }


        if (
            currentAudio.paused
        ) {

            try {

                await currentAudio.play();

                playButton.textContent =
                    "Ⅱ Pause";

            }

            catch (error) {

                console.error(
                    error
                );

                status.textContent =
                    "The browser blocked audio playback.";

            }

        }

        else {

            currentAudio.pause();


            playButton.textContent =
                "▶ Play";

        }

    }
);


/*
-----------------------------------------------------------
WHEN AUDIO FINISHES
-----------------------------------------------------------
*/

function audioFinished() {

    playButton.textContent =
        "▶ Play";

}


 /*
 Attach when audio exists
 */

function attachAudioEvents() {

    if (!currentAudio) {

        return;

    }


    currentAudio.addEventListener(
        "ended",
        audioFinished
    );

}


/*
-----------------------------------------------------------
COPY EQUATION
-----------------------------------------------------------
*/

copyButton.addEventListener(
    "click",
    async () => {

        if (!currentAnalysis) {

            return;

        }


        const terms =
            currentAnalysis.terms;


        const equation =
            "f(t) = " +

            terms
                .map(
                    term =>
                        `a_${term.index}(t) * ` +
                        `sin(2π*${term.frequency.toFixed(1)}*t + ${term.phase.toFixed(3)})`
                )
                .join(" + ");


        try {

            await navigator.clipboard.writeText(
                equation
            );


            copyButton.textContent =
                "✓ Copied";


            setTimeout(
                () => {

                    copyButton.textContent =
                        "Copy Equation";

                },
                1500
            );

        }

        catch {

            status.textContent =
                "Could not copy equation.";

        }

    }
);


/*
-----------------------------------------------------------
CONVERT BUTTON
-----------------------------------------------------------
*/

convertButton.addEventListener(
    "click",
    convert
);


/*
-----------------------------------------------------------
ENTER KEY
-----------------------------------------------------------
*/

wordInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            convert();

        }

    }
);


/*
-----------------------------------------------------------
RESIZE
-----------------------------------------------------------
*/

window.addEventListener(
    "resize",
    () => {

        if (
            currentAnalysis &&
            currentSignal
        ) {

            drawWaveform(
                currentAnalysis,
                currentSignal
            );

        }

    }
);


/*
-----------------------------------------------------------
START
-----------------------------------------------------------
*/

wordInput.focus();
