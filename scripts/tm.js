const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let CW = canvas.width = window.innerWidth;
let CH = canvas.height = window.innerHeight/2;

let paused = true;
let done = false;
let dragging = false;
let resizing = false;
let tape_bold = false;
let pause_bold = false;
let ffw_bold = false;
let reset_bold = false;
let pre_drag_x = 0;
let pre_drag_y = 0;

ctx.fillStyle = "white";
ctx.strokeStyle = "black";
ctx.lineWidth = 2;
ctx.textAlign = "center";

const Directions = {
    L: -1,
    R: 1,
    H: 0
}
class Camera {
    constructor(x=0,y=0,z=1) {
        this.x=x;
        this.y=y;
        this.z=z;
    }
}

class Rule {

    // (lhs, lhs_state) -> (rhs,rhs_state,dir)
    constructor(lhs, lhs_state, rhs, rhs_state, dir=Directions.L, text_entry=false) {
        this.lhs=lhs;
        this.lhs_state=lhs_state;
        this.rhs=rhs;
        this.rhs_state=rhs_state;
        this.dir=dir;
        
        this.text_entry = text_entry;
        this.text_entry_blink = '|';
    }

    toLabel() {
        if (this.text_entry) {
            if (this.lhs == "") {
                return this.text_entry_blink + " → " + this.rhs + " │";
            }
            else if (this.rhs == "") {
                return this.lhs + " → " + this.text_entry_blink + " │"; 
            }
            return this.lhs + " → " + this.rhs + " │ " + this.text_entry_blink; 
        }
        if (this.dir == Directions.L) {
            return this.lhs + " → " + this.rhs + " │ L"; 
        } else {
            return this.lhs + " → " + this.rhs + " │ R"; 
        }
    }

    blink() {
        if (this.text_entry_blink == '') {
            this.text_entry_blink = '|';
        } else {
            this.text_entry_blink = '';
        }
    }
}

class TuringMachine {
    constructor(rules=[],states=[],initial="",accepting=undefined) {
        this.rules = rules;
        this.states = states;
        this.state = initial;
        this.initial = initial;
        this.accepting = accepting;
        this.speed = 4;
        this.first = true;

        this.state_counter = 0; // For naming new states
    }

    setAccepting(new_accept) {
        this.accepting = new_accept;
    }

    addState(new_state) {
        if (this.states.length == 0) {
            this.state = new_state;
            this.initial = new_state;
        }
        this.states.push(new_state);

        this.state_counter++;

        drawAll();
    }

    addRule(new_rule) {
        this.rules.push(new_rule);
    }

    setInitial(id) {
        this.initial = id;
    }

    reset() {
        this.paused = true;
        this.state = this.initial;
        direction = Directions.L;
        tape.setContent(og_tape);
    }

    getRules(state) {
        let rule_list = [];
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            if (rule.lhs_state == state)
                rule_list.push(rule);
        }
        return rule_list;
    }

    getStates() {
        return this.states;
    }

    getAction(tape_val) {
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            // Check that the state matches
            if (rule.lhs_state != this.state) 
                continue;
            // Check that the tape condition matches
            if (rule.lhs != tape_val)
                continue;
            // Tape matches, so adjust state and direction
            this.state = rule.rhs_state;
            // Return new tape value and new tape direction
            return [rule.rhs, rule.dir];
        }
        // No matching rule, so stop
        return [tape_val,Directions.H];
    }

    step() {
        tape.idx+=-direction;
        let action = this.getAction(tape.get(tape.idx));

        console.log(action);
        if (action[1] == Directions.H || tm.state == tm.accepting) {
            done = true;
            return;
        } 

        tape.edit(tape.idx, action[0]);
        direction = -action[1];
    }
}

// Represents the tape data
class Tape {
    constructor(content=[], idx=0) {
        this.content = content;
        this.idx = idx;
    }

    get(idx) {
        if (idx >= this.content.length || idx < 0) {
            return '_';
        }
        return this.content[idx];
    }

    edit(idx, mark) {
        // Because the tape is only edited one square at a time, we know that if the index is out of bounds, then
        // we're either editing one after the end of the tape, or one before the bottom of the tape.
        if (idx >= this.content.length) {
            this.content.push(mark);
        }
        if (idx < 0) {
            this.content = ([mark] + this.content);
        }
        this.content[idx] = mark;
    }

    setContent(new_content) {
        this.content = [].concat(new_content);
        this.idx = 0;

        x_offset = 0;
        paused = true;
        done = false;
    }
}

function clear() {
    ctx.clearRect(0,0,CW,CH);
}

// Transforms the given coordinates according to the camera position
function transform(cam, x, y) {
    let new_x = (cam.x + x)*cam.z;
    let new_y = (cam.y + y)*cam.z;
    return [new_x, new_y];
}

// Draws the turing machine, including tape and indicators
function drawTape(cam, tape, x, y, dy, x_offset) {
    x += cam.x;
    y += cam.y;
    const tape_height = dy*cam.z;
    const idx = tape.idx;
    ctx.font = (tape_height + "px consolas");
    ctx.fillStyle="black";

    if (tape_bold) {
        ctx.lineWidth = 5;
    }
    else {
        ctx.lineWidth = 2;
    }
    // Draw the actual tape
    ctx.strokeRect(0, y, CW+10, tape_height);

    ctx.lineWidth = 2;
    // Draw the lines in the tape
    // Left side
    for (let i = 0; i < ((CW-cam.x)/tape_height/1.25); i++) {
        ctx.beginPath();
        ctx.moveTo(x + tape_height*i + tape_height/2 + x_offset, y + tape_height);
        ctx.lineTo(x + tape_height*i + tape_height/2 + x_offset, y);
        ctx.closePath();
        ctx.stroke();
    }
    // Right side
    for (let i = 0; i < ((CW+cam.x)/tape_height/1.25); i++) {
        ctx.beginPath();
        ctx.moveTo(x - tape_height*i - tape_height/2 + x_offset, y + tape_height);
        ctx.lineTo(x - tape_height*i - tape_height/2 + x_offset, y);
        ctx.closePath();
        ctx.stroke();
    }
    // Draw the text on the tape
    // Center to left
    let tape_idx = idx;
    for (let i = 0; i < ((CW-cam.x)/tape_height)/1.25; i++) {
        let tape_read = tape.get(tape_idx);
        if (tape_read != '_') {
            ctx.fillText(tape_read, x + tape_height*i + x_offset, y+tape_height*0.85, tape_height);
        }  
        tape_idx++;
    }
    // Center to right
    tape_idx = idx;
    for (let i = 0; i > -((CW+cam.x)/tape_height)/1.25; i--) {
        let tape_read = tape.get(tape_idx);
        if (tape_read != '_') {
            ctx.fillText(tape_read, x + tape_height*i + x_offset, y+tape_height*0.85, tape_height);
        }
        tape_idx--;
    }
}

let cam = new Camera();
let tape = new Tape();
let direction = Directions.L;
let speed = 70;
let tape_height = (CH/3*cam.z)/speed;
cam.z=0.3;
let x_offset = 0;
let og_tape = [];

let tm = new TuringMachine();

function drawStatics(x, y, tape_height, cam, tm) {
    x += cam.x;
    y += cam.y;

    // Change the color depending on status of turing machine
    let color = "black";
    if (tm.state == tm.accepting) {
        color = "green";
    } else if (done) {
        color = "red";
    }

    drawTriangle(x, y + tape_height * 1.52, cam.z * 50);
    drawTriangle(x, y - tape_height * 0.52, -cam.z * 50);
    
    function drawTriangle(x, y, z) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + z / 2, y + z / 2);
        ctx.lineTo(x - z / 2, y + z / 2);
        ctx.lineTo(x, y - z / 2);
        ctx.closePath();
        ctx.fill();
    }
    // Draw the state register
    ctx.strokeStyle = color;
    let register_width = (CW / 8);
    ctx.strokeRect(x - register_width / 2, y + tape_height * 1.8, register_width, CH / 6);
    ctx.font = (CH / 7 + "px consolas");
    ctx.fillText(tm.state, x, y + tape_height * 1.8 + CH/8, register_width);
    ctx.fillStyle = "black";
    ctx.fillRect(0, CH-10, CW, 50);

    ctx.strokeStyle = "black";

    drawPlayButton();
    drawFFWButton();
    drawResetButton();
    //drawSlider();
}

function validateEvent(event) {
    if (tutorial_showing || event.y > CH) {
        return false;
    }
    return true;
}

function onWheel(event) {
    if (!validateEvent(event)) {
        return;
    }
    if (event.deltaY < 0 && cam.z < 0.8) {
        cam.z += 0.1;
    } else if (event.deltaY > 0) {
        if (cam.z >= 0.2) {
            cam.z -= 0.1;
        }
    }
    drawAll();
}

function drawAll() {
    clear();
    drawTape(cam, tape, CW/2, CH/3, CH/3, x_offset, tm);
    drawStatics(CW/2, CH/3, CH/3*cam.z, cam, tm);
}

function onClick(event) {
    if (!validateEvent(event)) {
        return;
    }

    // Pause/play button?
    if (pause_bold) {
        paused = !paused;
        return;
    }

    // FFW button?
    if (ffw_bold) {
        tm.reset();
        //tape.idx += Directions.R;
        paused = false;
        for (let i = 0; i < 100; i++) {
            if (done) {
                break;
            }

            tm.step();
            x_offset = 0;
        }
        paused = true;
        drawAll();
        return;
    }

    // Reset button?
    if (reset_bold) {
        tm.reset();
        drawAll();
        return;
    }

    // Tape?
    if (tape_bold) {
        og_tape = ('_' + prompt("Enter new tape value")).split("");
        tape.setContent(og_tape);
        tm.reset();

        return;
    }

    // Dragging behavior
    pre_drag_x = (cam.x - event.x);
    pre_drag_y = (cam.y - event.y);

    if (CH - event.y <= 15) {
        resizing = true;
        dragging = false;
    } else {
        dragging = true;
        resizing = false;
    }
}

function onDragEnd(event) {
    resizing = false;
    if (!validateEvent(event)) {
        return;
    }
    dragging = false;
}

function onDragging(event) {

    if (resizing) {
        if (event.y <= 150 || (window.innerHeight - event.y) <= 150) {
            return;
        }
        CH = event.y
        FCH = window.innerHeight - CH
        canvas.height = CH
        fsm_canvas.height = FCH
        fsm_canvas.style.height = FCH + "px";
        ctx.textAlign = "center";
        fsm_ctx.textAlign = "center";
        
        return;
    }

    if (!validateEvent(event)) {

        resizing = false;
        dragging = false;
        document.body.style.cursor = "default"
        return;
    }

    // Adjust cursor if at border
    if (CH - event.y <= 15) {
        document.body.style.cursor = "n-resize"
    } else {
        document.body.style.cursor = "default"
    }

    if (dragging) {
        cam.x = (pre_drag_x + event.x);
        cam.y = (pre_drag_y + event.y);
        
        drawAll();
    }

    // Checking if hovering over the tape
    if (event.y < CH / 3 + cam.y) {
        tape_bold = false;
        pause_bold = false;
        return;
    }
    if (event.y < CH / 3 + cam.y + CH/3 * cam.z) {
        tape_bold = true;
    } else {
        tape_bold = false;
    }

    // Check if hovering over the icons
    if (event.y > CH - 50 && event.y < CH - 10) {
        if (event.x < 55 && !pause_bold) {
            pause_bold = true;
            ffw_bold = false;
            reset_bold = false;
            drawAll();
        }
        else if (event.x > 55 && event.x < 90 && !ffw_bold) {
            ffw_bold = true;
            pause_bold = false;
            reset_bold = false;
            drawAll();
        }
        else if (event.x >= 90 && event.x < 145 && (ffw_bold || !reset_bold)) {
            ffw_bold = false;
            pause_bold = false;
            reset_bold = true;
            drawAll();
        }
        else if (event.x >= 145 && reset_bold) {
            reset_bold = false;
            drawAll();
        }
    } else if (pause_bold || ffw_bold || reset_bold) {
        pause_bold = false;
        ffw_bold = false;
        reset_bold = false;
        drawAll();
    }

    return;
}

function animate() {

    // Clear tape
    ctx.clearRect(0, (CH/3+cam.y)-5, CW, (CH/3)*cam.z + 10);
    if (!paused && !done) {
        x_offset+=(tape_height*cam.z*direction*tm.speed);

        // We have finished the animation, and now we must evaluate the tape
        // using the turing machine
        if (Math.abs(x_offset) > CH/3*cam.z) {
            x_offset=0;
            tm.step();
        }
    }

    drawAll();
}

function drawHorizontalTriangle(x, y, z) {
    ctx.beginPath();
    ctx.moveTo(x - z/2, y - z/2);
    ctx.lineTo(x + z/2, y);
    ctx.lineTo(x - z/2, y + z/2);
    ctx.closePath();
    ctx.fill();
}

function drawResetButton() {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(125, CH - 30, 14, 1.1*Math.PI, 2.7*Math.PI);
    ctx.stroke();
    ctx.closePath();

    if (reset_bold) {
        ctx.beginPath();
        ctx.arc(125, CH - 30, 15, 1.1*Math.PI, 2.7*Math.PI);
        ctx.stroke();

        ctx.lineWidth = 3;
    }

    // Draw the arrow
    ctx.beginPath();
    ctx.moveTo(112, CH - 35);
    ctx.lineTo(111, CH - 45);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(112, CH - 35);
    ctx.lineTo(123, CH - 39);
    ctx.stroke();
    ctx.closePath();

    ctx.lineWidth = 2;
}

function drawFFWButton() {

    let thickness = 25;
    if (ffw_bold) {
        thickness = 28;
    }

    ctx.fillStyle = "black";
    drawHorizontalTriangle(70, CH - 30, thickness);
    ctx.fillStyle = "white";
    drawHorizontalTriangle(70, CH - 30, 15);
    ctx.fillStyle = "black";
    drawHorizontalTriangle(80, CH - 30, thickness);
    ctx.fillStyle = "white";
    drawHorizontalTriangle(80, CH - 30, 15);
}

function drawPlayButton() {
    if (pause_bold) {
        drawHorizontalTriangle(30, CH - 30, 30);
    } else {
        drawHorizontalTriangle(30, CH - 30, 28);
    }
    ctx.fillStyle = "white";
    drawHorizontalTriangle(30, CH - 30, 15);
}
drawAll();

window.addEventListener('mouseup', onDragEnd);
window.addEventListener('mousedown', onClick);
window.addEventListener('mousemove', onDragging);
window.addEventListener('wheel', onWheel);
window.setInterval(animate, 34);