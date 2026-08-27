/*
===========================================================
WORD → WAVE
MATHEMATICAL AUDIO ENCODER
===========================================================

Core algorithm:

A-Z
 ↓
1-26
 ↓
180Hz-1800Hz exponential mapping
 ↓
phase calculation
 ↓
Hann envelopes
 ↓
sum of sine waves
 ↓
normalization
 ↓
16-bit WAV
===========================================================
*/


const SAMPLE_RATE = 44100;

const PER_LETTER = 0.35;

const OVERLAP = 0.5;

const FREQ_LOW = 180.0;

const FREQ_HIGH = 1800.0;


/*
-----------------------------------------------------------
LETTER → VALUE
-----------------------------------------------------------
*/

function letterValue(character) {

    const ch = character.toUpperCase();

    if (ch >= "A" && ch <= "Z") {

        return ch.charCodeAt(0) - 64;

    }

    return null;
}


/*
-----------------------------------------------------------
VALUE → FREQUENCY
-----------------------------------------------------------
*/

function letterFreq(value) {

    const fraction =
        (value - 1) / 25;

    return (
        FREQ_LOW *
        Math.pow(
            FREQ_HIGH / FREQ_LOW,
            fraction
        )
    );
}


/*
-----------------------------------------------------------
ANALYZE WORD
-----------------------------------------------------------
*/

function analyzeWord(word) {

    const letters = [];

    for (const character of word) {

        if (
            letterValue(character) !== null
        ) {

            letters.push(
                character.toUpperCase()
            );

        }

    }


    const n = letters.length;


    let duration =
        Math.max(
            0.6,

            PER_LETTER *
            (
                1 +
                (n - 1) *
                (1 - OVERLAP * 0.5)
            )
        );


    const terms = [];


    for (
        let i = 0;
        i < letters.length;
        i++
    ) {

        const letter =
            letters[i];


        const value =
            letterValue(letter);


        const frequency =
            letterFreq(value);


        const phase =
            (value / 26) *
            2 *
            Math.PI;


        const center =
            (i + 0.5) *
            PER_LETTER *
            (1 - OVERLAP * 0.5);


        const width =
            PER_LETTER *
            (0.5 + OVERLAP);


        terms.push({

            index: i + 1,

            letter: letter,

            value: value,

            frequency: frequency,

            phase: phase,

            center: center,

            width: width

        });

    }


    if (terms.length > 0) {

        const last =
            terms[terms.length - 1];


        duration =
            last.center +
            last.width +
            0.15;

    }


    return {

        word: word,

        letters: letters,

        terms: terms,

        duration: duration

    };

}


/*
-----------------------------------------------------------
HANN BUMP
-----------------------------------------------------------
*/

function hannBump(
    t,
    center,
    width
) {

    const x =
        (t - center) / width;


    if (
        Math.abs(x) >= 1
    ) {

        return 0;

    }


    return (
        0.5 *
        (
            1 +
            Math.cos(
                Math.PI * x
            )
        )
    );

}


/*
-----------------------------------------------------------
RENDER WAVE
-----------------------------------------------------------
*/

function renderWave(
    analysis
) {

    const sampleCount =
        Math.floor(
            SAMPLE_RATE *
            analysis.duration
        );


    const signal =
        new Float32Array(
            sampleCount
        );


    for (
        const term of analysis.terms
    ) {

        for (
            let i = 0;
            i < sampleCount;
            i++
        ) {

            const t =
                i / SAMPLE_RATE;


            const envelope =
                hannBump(
                    t,
                    term.center,
                    term.width
                );


            const sine =
                Math.sin(
                    2 *
                    Math.PI *
                    term.frequency *
                    t +
                    term.phase
                );


            signal[i] +=
                envelope * sine;

        }

    }


    /*
    Normalize
    */

    let peak = 0;


    for (
        let i = 0;
        i < signal.length;
        i++
    ) {

        const magnitude =
            Math.abs(
                signal[i]
            );


        if (
            magnitude > peak
        ) {

            peak = magnitude;

        }

    }


    if (peak > 0) {

        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            signal[i] /=
                peak;

        }

    }


    return signal;

}


/*
-----------------------------------------------------------
WRITE STRING INTO WAV
-----------------------------------------------------------
*/

function writeString(
    view,
    offset,
    string
) {

    for (
        let i = 0;
        i < string.length;
        i++
    ) {

        view.setUint8(
            offset + i,
            string.charCodeAt(i)
        );

    }

}


/*
-----------------------------------------------------------
CREATE WAV
-----------------------------------------------------------
*/

function encodeWav(
    signal
) {

    const dataSize =
        signal.length * 2;


    const buffer =
        new ArrayBuffer(
            44 + dataSize
        );


    const view =
        new DataView(
            buffer
        );


    /*
    RIFF
    */

    writeString(
        view,
        0,
        "RIFF"
    );


    view.setUint32(
        4,
        36 + dataSize,
        true
    );


    /*
    WAVE
    */

    writeString(
        view,
        8,
        "WAVE"
    );


    /*
    fmt
    */

    writeString(
        view,
        12,
        "fmt "
    );


    view.setUint32(
        16,
        16,
        true
    );


    /*
    PCM
    */

    view.setUint16(
        20,
        1,
        true
    );


    /*
    Mono
    */

    view.setUint16(
        22,
        1,
        true
    );


    /*
    Sample rate
    */

    view.setUint32(
        24,
        SAMPLE_RATE,
        true
    );


    /*
    Byte rate
    */

    view.setUint32(
        28,
        SAMPLE_RATE * 2,
        true
    );


    /*
    Block alignment
    */

    view.setUint16(
        32,
        2,
        true
    );


    /*
    Bits per sample
    */

    view.setUint16(
        34,
        16,
        true
    );


    /*
    Data
    */

    writeString(
        view,
        36,
        "data"
    );


    view.setUint32(
        40,
        dataSize,
        true
    );


    /*
    Convert floating point
    to signed 16-bit PCM
    */

    let offset = 44;


    for (
        let i = 0;
        i < signal.length;
        i++
    ) {

        let sample =
            Math.max(
                -1,
                Math.min(
                    1,
                    signal[i]
                )
            );


        let value;


        if (sample < 0) {

            value =
                sample * 32768;

        }

        else {

            value =
                sample * 32767;

        }


        view.setInt16(
            offset,
            value,
            true
        );


        offset += 2;

    }


    return new Blob(
        [buffer],
        {
            type: "audio/wav"
        }
    );

}


/*
-----------------------------------------------------------
FILENAME
-----------------------------------------------------------
*/

function makeFilename(
    word
) {

    let clean = "";


    for (
        const character of word
    ) {

        if (
            /[a-zA-Z0-9]/.test(
                character
            )
        ) {

            clean +=
                character.toLowerCase();

        }

    }


    if (!clean) {

        clean = "word";

    }


    return clean + ".wav";

}
