tutorial_showing = false;

const TUTORIAL_ELEM = document.getElementById("tutorial")
function onClick(event) {
    switch (event.target.id) {
        case "close_tutorial":
            tutorial_showing = false;
            TUTORIAL_ELEM.hidden = true;
            return;
    }
}

window.addEventListener('click', onClick);

function toggleTutorial() {
    if (tutorial_showing) {
        tutorial_showing = false;
        TUTORIAL_ELEM.hidden = true;
    } else {
        tutorial_showing = true;
        TUTORIAL_ELEM.hidden = false;
    }
}