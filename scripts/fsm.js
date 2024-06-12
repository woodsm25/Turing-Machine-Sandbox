// TODO: Set up interface
// TODO: Show FSM paths
// TODO: Refactor code and make ctx, functions local
// TODO: Move classes into seperate files, clean up
// TODO: fix bezier select teleportation
// TODO: Draw loop with bezier?
// TODO: node size should be global

const fsm_canvas = document.getElementById('fsm_canvas');
const fsm_ctx = fsm_canvas.getContext('2d');
fsm_canvas.style.height = window.innerHeight/2 + "px";
fsm_canvas.height = window.innerHeight/2;
fsm_canvas.width = window.innerWidth;

let FCH = window.innerHeight/2;

fsm_ctx.strokeStyle = "black";
fsm_ctx.lineWidth = 2;
fsm_ctx.textAlign = "center";

let state_size = 30;
let drag_arrow_start = undefined;
let drag_arrow_loop_ang = 0;

let cursor_x = 0;
let cursor_y = 0;

let text_entry_rule = undefined;
let text_entry_edge = undefined;
let animation_timer = undefined;
let collision_point = undefined;
let text_entry_stage = 0;

let help_selected = false;
let show_help_text = true;

const Dragging = {
    SCREEN: -1,
    NODE: 0,
    VERTEX: 1,
    NONE: 2,
    NEW_VERTEX: 3
}

function getPointOnCircle(ang, size) {
    let x = size*Math.sin(ang)
    let y = size*Math.cos(ang);
    return [x,y];
}

class Pair {
    constructor(x=0,y=0) {
        this.x=x;
        this.y=y;
    }
}

class BoundingBox {
    constructor(parent, l, h, x_off=0, y_off=0) {
        this.parent = parent;
        this.x_off = x_off;
        this.y_off = y_off;
        this.l=l;
        this.h=h;
    }

    getCollision(x,y) {
        let s = getScale() * state_size;
        let new_l = this.l*s;
        let new_h = this.h*s;
        let new_x = this.parent.x + (this.x_off*new_l);
        let new_y = this.parent.y + (this.y_off*new_h);

        // Return collision point on perimeter
        // Find angle from center to point
        let scalar_y = y - new_y;
        let scalar_x = x - new_x;
        let norm = Math.abs(scalar_y) + Math.abs(scalar_x);
        scalar_y /= norm;
        scalar_x /= norm;
        // Move point in direction of angle until it exits the boundary
        let limit = 0;
        while (this.parent.in(x, y) && limit < 50) {
            x += scalar_x;
            y += scalar_y;
            limit++;
        }

        return [x+scalar_x, y+scalar_y];
    }

    in(x,y) {

        if (x < this.parent.x - this.l/2)
            return false;
        if (x > this.parent.x + this.l/2)
            return false;
        if (y < this.parent.y - this.h/2)
            return false;
        if (y > this.parent.y + this.h/2)
            return false;

        return true;
    }

    draw() {
        fsm_ctx.strokeStyle="red";
        fsm_ctx.strokeRect(this.parent.x - this.l / 2, this.parent.y - this.h / 2, this.l, this.h);
        fsm_ctx.strokeStyle="black";
    }
}
class FSMNode {

    constructor(state="q?", x=0, y=0, s=1) {
        this.state = state;
        this.x = x;
        this.y = y;
        this.s=s;


        this.main_bb = new BoundingBox(this, 65, 65);
        /*
        this.bb = [
            new BoundingBox(this, 1.1, 2.25),
            new BoundingBox(this, 1.9, 1.5),
        ];
        */
       this.bb = [];

        this.edges = [];
    }

    connect(edge) {
        if (!this.edges.includes(edge))
            this.edges.push(edge);
    }

    update() {
        this.edges = this.edges.filter(function (edge) {
            return !edge.delete_flag;
        });
        this.edges.forEach(edge => {
            edge.update = true;
        });
    }

    showBoundingBox() {
        this.main_bb.draw();
        for (let i = 0; i < this.bb.length; i++) {
            this.bb[i].draw();
        }
    }

    getCollision(x,y) {

        if (!this.in(x,y))
            return false;

        let new_x = this.x;
        let new_y = this.y;

        // Return collision point on perimeter
        // Find angle from center to point
        let scalar_y = y - new_y;
        let scalar_x = x - new_x;
        let norm = Math.abs(scalar_y) + Math.abs(scalar_x);
        scalar_y /= norm;
        scalar_x /= norm;
        // Move point in direction of angle until it exits the boundary
        while (this.in(x, y)) {
            x += scalar_x;
            y += scalar_y;
        }

        return [x+scalar_x, y+scalar_y];
    }

    in(x,y) {
        /*
        if (!this.main_bb.in(x, y))
            return false;
        
        for (let i = 0; i < this.bb.length; i++) {
            if (this.bb[i].in(x,y)) 
                return true;
        }
        return false;
        */

        if (this.main_bb.in(x,y)) {
            return true;
        }
    }

    draw() {
        
        // Draw the circle
        fsm_ctx.beginPath();
        fsm_ctx.arc(this.x, this.y, this.s, 0, 2*Math.PI);

        // Finish!
        fsm_ctx.fillStyle="white";
        fsm_ctx.fill();
        fsm_ctx.stroke();

        // If this is an accepting state, we draw a second circle:
        if (tm.accepting == this.state) {
                // Draw the circle
            fsm_ctx.beginPath();
            fsm_ctx.arc(this.x, this.y, this.s*0.8, 0, 2*Math.PI);

            // Finish!
            fsm_ctx.fillStyle="white";
            fsm_ctx.fill();
            fsm_ctx.stroke();
        }

        // If this is an initial state, draw an arrow:
        if (tm.initial == this.state) {
            let measure = state_size/2;
            drawArrow(this.x - measure*4, this.x - measure*2, this.y, this.y);
        }

        // Now draw the text
        fsm_ctx.font = (this.s*1.25 + "px consolas");
        fsm_ctx.fillStyle = "black";
        fsm_ctx.fillText(this.state, this.x, this.y + this.s*0.4, this.s*1.25);

    }

    getOutgoingConnectionTo(n) {
        for (let i = 0; i < this.edges.length; i++) {
            let v = this.edges[i];
            if (v.n1 != this)
                continue;
            if (v.n2 == n) 
                return v;
        }
        return undefined;
    }

}

function drawArrow(x1, x2, y1, y2) {
    fsm_ctx.strokeStyle="black";
    fsm_ctx.beginPath();
    fsm_ctx.moveTo(x1,y1);
    fsm_ctx.lineTo(x2,y2);
    fsm_ctx.closePath();
    fsm_ctx.stroke();

    // Calculating angle
    let ang = getAng(x1, x2, y1, y2);

    drawArrowHead(x2, y2, ang + Math.PI, state_size/3);
}

function getAng(x1, x2, y1, y2) {
    let ang = -Math.atan((y1-y2)/(x1-x2));
    if (ang > 0) {
        ang -= Math.PI/2
    } else {
        ang += Math.PI/2
    }
    if (y2 > y1) {
        ang = ang + Math.PI;
    }
    if (y1 == y2) {
        if (x1 > x2) {
            ang = Math.PI/2;
        } else {
            ang = -Math.PI/2;
        }
    }

    return ang;
}


function drawLoop(n, ang, labels) {
    // Where ang is the angle of the loop on the circle
    let point = getPointOnCircle(ang, n.s);
    let x = point[0];
    let y = point[1];
    let ang2 = 0.4 * Math.PI;

    fsm_ctx.beginPath();
    fsm_ctx.arc(n.x + x, n.y + y, n.s/1.5, 0, Math.PI*2);
    fsm_ctx.stroke();

    let coefficient = Math.PI/4.6;
    let arrow_point = getPointOnCircle(ang+coefficient, n.s);

    drawArrowHead(n.x + arrow_point[0], n.y + arrow_point[1], Math.PI + ang+Math.PI/0.49, n.s/3);

    // Draw the label
    if (labels == undefined)
        return;

    point = getPointOnCircle(ang, n.s*2.3);
    fsm_ctx.font = (n.s/2 + "px consolas");
    let y_incr = 0;

    labels.forEach(label => {
        fsm_ctx.fillText(label.toLabel(), n.x + point[0], n.y + point[1] + y_incr);
        y_incr -= state_size/2;
    });
}

function drawArrowHead(x, y, ang, size) {
    fsm_ctx.beginPath();
    // Shaft
    let point2 = getPointOnCircle(ang + Math.PI/6, size);
    let point3 = getPointOnCircle(ang - Math.PI/6, size);
    // Side 1
    fsm_ctx.moveTo(x,y);
    fsm_ctx.lineTo(x-point2[0], y-point2[1]);

    // Side 2
    fsm_ctx.moveTo(x,y);
    fsm_ctx.lineTo(x-point3[0], y-point3[1]);

    fsm_ctx.closePath();
    fsm_ctx.stroke();
}

class Edge {

    constructor(n1, n2, rule, cx=-1, cy=-1, self_ang=0, fake=false) {
        this.n1=n1;
        this.n2=n2;
        this.rules = [rule];
        this.cx=cx;
        this.cy=cy;
        this.self_ang = self_ang; // Used if the edge connects to itself
        this.mutual_priority = false;
        this.delete_flag = false;
        this.fake = fake;

        // Called whenever a node is moved
        this.update = true;

        if (!fake) {
            n1.connect(this);
            n2.connect(this);
        }

        this.mutual = undefined;
        if (this.n1 != this.n2) {
            this.mutual = this.n2.getOutgoingConnectionTo(this.n1);
            if (this.mutual != undefined) {
                this.mutual_priority = true;
                this.mutual.mutual_priority = false;
                this.mutual.mutual = this.n1;
            }
        }
    } 

    isLinear() {
        if (this.cx == -1 || this.cy == -1) {
            return true;
        }
        return false;
    }

    draw(top=true) {

        // TODO: how to determine angle for loop?
        if (this.n1 == this.n2) 
            return drawLoop(this.n1, this.self_ang, this.rules);
    
        // If both nodes are connected to each other, then adjust edges so they don't overlap
        let offset_y = 0;
        if (this.mutual != undefined) {
            if (this.mutual_priority) {
                offset_y += 0.025*state_size;
            } else {
                offset_y -= 0.025*state_size;
            }
        }
        // FIXME: why not just use point on circle? no need for complicated collision system!!

        let scalar_y = this.n1.y - this.n2.y;
        let scalar_x = this.n1.x - this.n2.x;
        let norm = Math.abs(scalar_y) + Math.abs(scalar_x);
        scalar_y /= norm;
        scalar_x /= norm;
    
        let p1 = this.p1;
        let p2 = this.p2;
        if (this.update) {
            // Remember these collision points
            let new_p1 = this.n1.getCollision(this.n1.x - scalar_x, this.n1.y - scalar_y + offset_y);
            let new_p2 = this.n2.getCollision(this.n2.x + scalar_x, this.n2.y + scalar_y + offset_y);

            // Adjust control point when dragging stuff around
            if (!this.isLinear()) {
                this.cx += (new_p1[0] - p1[0]) + (new_p2[0] - p2[0]);
                this.cy += (new_p1[1] - p1[1]) + (new_p2[1] - p2[1]);
            }

            p1 = this.p1 = new_p1;
            p2 = this.p2 = new_p2;
            this.update = false;
        }

        let left_x = this.n2.x;
        let left_y = this.n2.y;
        let right_x = this.n1.x;
        let right_y = this.n1.y;

        // Get midpoint
        let midx = p1[0];
        let midy = p1[1];
            
        midx += (p2[0] - p1[0])/2;
        midy += (p2[1] - p1[1])/2;

        if (this.mutual != undefined) {

            this.cx = midx;

            if (this.mutual_priority) {
                this.cy = midy + state_size*1.5;
            } else {
                this.cy = midy - state_size*1.5;
            }
        } 
    
        // Control point is not set, so use a straight line
        if (this.isLinear()) {
            // Draw line
            fsm_ctx.strokeStyle="black";
            fsm_ctx.beginPath();
            fsm_ctx.moveTo(p1[0],p1[1]);
            fsm_ctx.lineTo(p2[0],p2[1]);
            fsm_ctx.closePath();
            fsm_ctx.stroke();
        } else {

            if (this.cy > midy)
                top = false;
            let bez = drawBezier(p1[0], p1[1], this.cx, this.cy, p2[0], p2[1], 0.01);
            let arrow_last = bez[0];
            let midpoint = bez[1];

            right_x = arrow_last[0];
            right_y = arrow_last[1];

            left_x = p2[0];
            left_y = p2[1];

            midx = midpoint[0];
            midy = midpoint[1];
        }
        // Draw arrow head
        let ang = -Math.atan((left_y-right_y)/(left_x-right_x));
        if (ang > 0) {
            ang -= Math.PI/2
        } else {
            ang += Math.PI/2
        }
        if (right_y > left_y) {
            ang = ang + Math.PI;
        }
        
        drawArrowHead(p2[0],p2[1], ang, this.n1.s/3);
    
        // Drawing the label
        ang = Math.atan((this.n2.y-this.n1.y)/(this.n2.x-this.n1.x));
        fsm_ctx.font = (this.n1.s/2 + "px consolas");

        // Rotating test
        fsm_ctx.save();
        fsm_ctx.translate(midx, midy);
        fsm_ctx.rotate(ang);

        let y_offset = 0;
        this.rules.forEach(rule => {
    
            fsm_ctx.fillText(rule.toLabel(), 0, y_offset - state_size/4);
            if (top)
                y_offset -= state_size/2;
            else
            y_offset += state_size/2;
        });
        fsm_ctx.restore();
    }

    addRule(rule) {
        this.rules.push(rule);
    }

    in(x,y) {

        // Do a different calculation if we're in a loop
        if (this.n1 == this.n2)
            return false;

        // Do a different calculation if we're in a curve
        if (!this.isLinear())
            return this.inCurve(x,y);

        let left = this.n1;
        let right = this.n2;

        if (this.n1.x > this.n2.x) {
            left = this.n2;
            right = this.n1;
        }


        let screen_coords = getScreenCoordinates(x, y);
        x = screen_coords.x;
        y = screen_coords.y - FCH;

        // Define a point on this line as a function l(t) on the domain
        // [n1.x, n2.x]. The point (x,y) is on this line if |l(x) - y| < 20
        function l(x, left, right, up, down) {
            let slope = -(down.y - up.y)/(right.x - left.x);
            return slope*(x-left.x) + left.y;
        }
        // FIXME: doesn't work with offset lines (need to set rel to p values)
        // Check domain
        if (x < left.x || x > right.x)
            return false;
        // TODO: check range
        let error = Math.abs(l(x, left, right, this.n2, this.n1) - y);
        return error < 20;
    }

    inCurve(x,y) {

        // Evaluate domain and range first
        let left = this.n1;
        let right = this.n2;

        if (this.n1.x > this.n2.x) {
            left = this.n2;
            right = this.n1;
        }

        let screen_coords = getScreenCoordinates(x, y);
        x = screen_coords.x;
        y = screen_coords.y - FCH;
        // Check domain
        if (x < left.x || x > right.x)
        return false;
        // Approximate bezier curve using rough fidelity
        let t = 0;
        let new_x = this.n1.x;
        let new_y = this.n1.y;
        while (t < 1) {
            new_x = bezier(t, this.p1[0], this.cx, this.p2[0]);
            new_y = bezier(t, this.p1[1], this.cy, this.p2[1]);

            //fsm_ctx.fillRect(new_x, new_y, 5,5);

            let error = ((y - new_y)**2 + (x - new_x)**2)/2;

            if (error < 50) {
                return true;
            }

            t += 0.1;
        }
        return false;
    }
}

function drawNodes() {
    for (let i = 0; i < nodes.length; i++) {
        nodes[i].draw();
        //nodes[i].showBoundingBox();
    }
}

function drawEdges() {
    for (let i = 0; i < edges.length; i++) {
        edges[i].draw();
    }
}

// let node = new FSMNode("1", CW/2, CH/2, 50, cam);
// let node2 = new FSMNode("0", CW/2-200, CH/2+100, 50, cam);
// let v1 = new Vertex(node, node, "1|R");
// let v2 = new Vertex(node, node2, "0|L");
// let v3 = new Vertex(node2, node, "1|R");

let nodes = [];
let edges = [];

// Step 1: Draw all edges
drawEdges();
// Step 2: Draw all nodes!
drawNodes();

let fsm_pre_drag_x = 0;
let fsm_pre_drag_y = 0;
let fsm_dragging = Dragging.NONE;
let dragged = null;


let scale_x = 1;
let scale_y = 1;

window.addEventListener('click', onClickFSM);
window.addEventListener('mouseup', onDragEndFSM);
window.addEventListener('mousedown', onDragStartFSM);
window.addEventListener('mousemove', onDraggingFSM);
window.addEventListener('wheel', onWheelFSM);
window.addEventListener('keypress', onKeyPress);

drawHelp();

function drawBezier(x1, y1, cx, cy, x2, y2, fidelity=0.01) {
    let t = 0;
    let draw_x = x1;
    let draw_y = y1;

    let midpoint = [0,0];
    let lastpoint = [0,0];
    fsm_ctx.beginPath();
    fsm_ctx.moveTo(draw_x, draw_y);
    while (t < 1) {
        draw_x = bezier(t, x1, cx, x2);
        draw_y = bezier(t, y1, cy, y2);

        fsm_ctx.lineTo(draw_x, draw_y);

        if (t >= 0.5 && midpoint[0] == 0)
            midpoint = [draw_x, draw_y];

        if (t >= 0.9 && lastpoint[0] == 0)
            lastpoint = [draw_x, draw_y];
        
        t += fidelity;
    }
    fsm_ctx.lineTo(x2,y2);
    fsm_ctx.strokeStyle = "black";
    fsm_ctx.stroke();
    
    // Return the last point and the midpoint of the curve
    // These are used for drawing the arrow and label onto the line
    return [lastpoint, midpoint];
}

function bezier(t, x1, cx, x2) {
    return (1 - t) * ((1 - t) * x1 + t * cx) + t * ((1 - t) * cx + t * x2);
}

function fsmValidate(y=CH) {
    return !tutorial_showing || y >= CH && nodes.length > 0;
}

function onWheelFSM(event) {

    if (!fsmValidate(event.y))
        return;

    // Ignore if no elements on screen
    if (nodes.length == 0)
        return;

    let delta = 0.1;
    if (event.deltaY > 0) {
        delta = -0.1;
    }

    let zoom_pre = getScreenCoordinates(cursor_x, cursor_y);
    fsm_ctx.scale(1 + delta, 1 + delta)
    let zoom_post = getScreenCoordinates(cursor_x, cursor_y);

    fsm_ctx.translate(zoom_post.x - zoom_pre.x, zoom_post.y - zoom_pre.y);

    drawFSM();
}

function getNode(cursor_x, cursor_y) {
    let screen_coords = getScreenCoordinates(cursor_x, cursor_y);
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].in(screen_coords.x, screen_coords.y - FCH)) {
            return nodes[i];
        }
    }
    return undefined;
}

function onDragStartFSM(event) {

    if (!fsmValidate(event.y)) {
        return;
    }

    clearTextEntry();

    fsm_pre_drag_x = event.x;
    fsm_pre_drag_y = event.y;

    // Check if we're clicking on an element
    let screen_coords = getScreenCoordinates(event.x, event.y);
    let n = getNode(event.x, event.y);
    if (n != undefined) {

        // Found node: If alt clicking, set as accept state.
        if (event.altKey) {
            if (tm.accepting == n.state) {
                tm.setAccepting(null)
            } else {
                tm.setAccepting(n.state);
            }

            drawFSM();
            return;
        }

        // Found node: If ctrl clicking, set as initial state.
        if (event.ctrlKey) {
            tm.setInitial(n.state);
            tm.reset();
            drawFSM();
            return;
        }

        // Found node: If shift clicking, we create an arrow. Otherwise, we drag the node.
        if (!event.shiftKey) {
            fsm_dragging = Dragging.NODE;
            dragged = n;
            return;
        }


        // Shift clicking, so let's create an arrow
        drag_arrow_start = n;
        fsm_dragging = Dragging.NEW_VERTEX;
        return;
    }

    // Check if we're clicking on an edge
    for (let i = 0; i < edges.length; i++) {
        let e = edges[i];
        if (e.in(event.x, event.y)) {
            fsm_dragging = Dragging.VERTEX;
            fsm_pre_drag_x -= e.cx;
            fsm_pre_drag_y -= e.cy;
            dragged = e;
            return;
        }
    }

    // Check if making a new node
    if (event.shiftKey) {
        let new_state = "q" + tm.state_counter;
        tm.addState(new_state);

        let screen_coords = getScreenCoordinates(event.x, event.y);
        let new_node = new FSMNode(new_state, screen_coords.x, screen_coords.y - FCH, state_size, cam);
        nodes.push(new_node);

        drawFSM();

        tm.reset();

        return;
    }

    // Otherwise we're clicking on the screen
    if (!fsmValidate(event.y))
        return;

    fsm_dragging = Dragging.SCREEN;

    fsm_pre_drag_x = event.x;
    fsm_pre_drag_y = event.y;
}

function animateTextEntry() {
    text_entry_rule.blink();
    drawFSM();
}

function onDragEndFSM(event) {

    clearTextEntry();

    function createNewEdge(x, y) {
        let drag_arrow_end = getNode(event.x, event.y);
        if (drag_arrow_end == undefined) {
            fsm_dragging = Dragging.NONE;
            return;
        }

        
        tm.reset();
        //let new_rule = prompt("Enter the rule for this arrow").split(" ");

        // Get direction from rule:
        
        //new_rule = new Rule(new_rule[0], drag_arrow_start.state, new_rule[1], drag_arrow_end.state, dir)
        let new_rule = new Rule("", drag_arrow_start.state, "", drag_arrow_end.state, Directions.R, true);
        text_entry_rule = new_rule;
        text_entry_stage = 1;
        animation_timer = window.setInterval(animateTextEntry, 500);
        
        
        // Check that an edge already exists
        let edge = drag_arrow_start.getOutgoingConnectionTo(drag_arrow_end);
        if (edge != undefined) {
    
            text_entry_edge = edge;
            edge.addRule(new_rule);

            return;
        }

        // Check if it's a loop: we add the extra loop ang parameter if so
        if (drag_arrow_start == drag_arrow_end) {
            edge = new Edge(drag_arrow_start, drag_arrow_end, new_rule, -1, -1, drag_arrow_loop_ang);
        } else {
            edge = new Edge(drag_arrow_start, drag_arrow_end, new_rule);
        }

        text_entry_edge = edge;
        edges.push(edge);

        drag_arrow_start.update();
    }

    // Check if making new arrow
    if (fsm_dragging == Dragging.NEW_VERTEX && drag_arrow_start != undefined) {
        createNewEdge(event.x, event.y);
    }

    drawFSM();
    fsm_dragging = Dragging.NONE;
}

function getScale() {
    return fsm_ctx.getTransform().a;
}

function getScreenCoordinates(x, y) {
    let trans = fsm_ctx.getTransform()
    return new Pair(
        (x - trans.e)/getScale(),
        (y - trans.f - FCH)/getScale() + FCH - (CH - FCH)/getScale()
    );
}

function clearTextEntry() {
    if (text_entry_rule == undefined)
        return;

    // Don't want to delete the edge if there's valid rules on it  
    if (text_entry_edge.rules.length > 1) {
        text_entry_edge.rules = text_entry_edge.rules.filter(function (rule) {
            return rule != text_entry_rule;
        })
    } 

    // Otherwise we do want to delete it
    else {
        edges = edges.filter(function (edge) {
            return edge != text_entry_edge;
        })
        text_entry_edge.delete_flag = true;
        text_entry_edge.n1.update();
        text_entry_edge.n2.update();
    }

    window.clearInterval(animation_timer);
    animation_timer = undefined;
    text_entry_rule = undefined;
    text_entry_edge = undefined;
    text_entry_stage = 0;
}

function onKeyPress(event) {

    // For entering text into a new rule
    if (text_entry_stage > 0) {
        switch(text_entry_stage) {
            case 1:
                text_entry_rule.lhs = event.key;
                text_entry_stage++;
                drawFSM();
                return;
            case 2:
                text_entry_rule.rhs = event.key;
                text_entry_stage++;
                drawFSM();
                return;
            case 3:
                if (event.key == 'l' || event.key == 'L') {
                    text_entry_rule.dir = Directions.L;
                } else {
                    text_entry_rule.dir = Directions.R;
                }
                text_entry_stage = 0;
                text_entry_rule.text_entry = false;
                break;
        }

        // Now validate the new rule...
        // Check for nondeterminism
        let nondeterministic = false;
        
        edges.forEach(edge => {
            edge.rules.forEach(rule => {
                if (rule != text_entry_rule && text_entry_rule.lhs == rule.lhs && text_entry_rule.lhs_state == rule.lhs_state) {
                    nondeterministic = true;
                    return;
                }
            })
        })

        if (nondeterministic) {
            clearTextEntry();
            drawFSM();
            return;
        }

        tm.addRule(text_entry_rule);
        tm.reset();

        window.clearInterval(animation_timer);
        animation_timer = undefined;
        text_entry_rule = undefined;
        text_entry_edge = undefined;

        drawFSM();
    }

    // Delete node or edge on pressing x
    if (event.key == 'x') {
        let deleted_node = getNode(cursor_x, cursor_y);
        if (deleted_node != undefined) {

            // Delete all rules associated with the incoming and outgoing edges on this node
            //     First collect all edges and rules to delete
            let delete_edges = [];
            let delete_rules = [];
            edges.forEach(edge => {
                if (edge.n1 == deleted_node || edge.n2 == deleted_node) {
                    delete_edges.push(edge);
                    edge.delete_flag = true; // Used to remove it from a node's edge list when the node updates
                    delete_rules = delete_rules.concat(edge.rules);
                }
            })
            
            //     Second, delete all edges from edge array and node from node array
            edges = edges.filter(function (edge) {
                return !delete_edges.includes(edge);
            });

            nodes = nodes.filter(function (node) {
                return node != deleted_node;
            });

            //     Now delete the node and the edges from the turing machine
            if (tm.accepting == deleted_node.state) {
                tm.accepting = undefined;
            }
            if (tm.initial == deleted_node.state) {
                tm.initial = "";
            }

            tm.states = tm.states.filter(function (state) {
                return state != deleted_node.state;
            })

            tm.rules = tm.rules.filter(function (rule) {
                return !delete_rules.includes(rule);
            })

            nodes.forEach(node => {node.update();});

            tm.reset();
            drawAll();
            drawFSM();
        }
    }
}

function onDraggingFSM(event) {

    if (!fsmValidate(event.y)) {
        if (help_selected) {
            help_selected = false;
            drawFSM();
        }
        return;
    }

    cursor_x = event.x;
    cursor_y = event.y;

    let x = (fsm_pre_drag_x - event.x)/getScale();
    let y = (fsm_pre_drag_y - event.y)/getScale();

    if (fsm_dragging == Dragging.NONE) {
        if (event.y > window.innerHeight - 50 && event.x > CW - 30) {
            if (!help_selected) {
                help_selected = true;
                drawFSM();
            }
        } else {
            if (help_selected) {
                help_selected = false;
                drawFSM();
            }
        }
        return;
    }

    if (fsm_dragging == Dragging.VERTEX) {

        let screen_coords = getScreenCoordinates(event.x, event.y);
        dragged.cx = screen_coords.x;
        dragged.cy = screen_coords.y - FCH;

        drawFSM();
        return;
    }

    if (fsm_dragging == Dragging.NODE) {
        dragged.x -= x;
        dragged.y -= y;

        dragged.update();

        drawFSM();

        fsm_pre_drag_x = event.x;
        fsm_pre_drag_y = event.y;
        return;
    }

    if (fsm_dragging == Dragging.SCREEN) {

        fsm_ctx.translate(-x, -y);
        drawFSM();

        fsm_pre_drag_x = event.x;
        fsm_pre_drag_y = event.y;
        return;
    }

    if (fsm_dragging == Dragging.NEW_VERTEX) {
        let screen_coords = getScreenCoordinates(event.x, event.y);
        screen_coords.y -= FCH;

        fsmClear();
        drawEdges();

        // If within the node, draw a loop. Otherwise draw a straight line
        if (drag_arrow_start.in(screen_coords.x, screen_coords.y)) {
            drag_arrow_loop_ang = getAng(drag_arrow_start.x, screen_coords.x, drag_arrow_start.y, screen_coords.y)
            drawLoop(drag_arrow_start, drag_arrow_loop_ang, undefined);
        } else {
            // Check if we're pointing the arrow into another node. If so, we want to stop it at the collision point
            let node = getNode(event.x, event.y);
            if (node == undefined) {
                drawArrow(drag_arrow_start.x, screen_coords.x, drag_arrow_start.y, screen_coords.y);
                collision_point = undefined;
            } else {
                if (collision_point == undefined) {
                    collision_point = node.getCollision(screen_coords.x, screen_coords.y);
                }
                drawArrow(drag_arrow_start.x, collision_point[0], drag_arrow_start.y, collision_point[1]);
            }
        }


        drawNodes();
        drawHelp();
    }

    return;
}

function onClickFSM() {
    show_help_text = false;
    if (help_selected) {
        toggleTutorial();
    }
}

function drawHelp() {
    fsm_ctx.save();
    fsm_ctx.setTransform(1, 0.0, 0, 1, 0, 0);
    fsm_ctx.fillStyle="black";
    if (help_selected) {
        fsm_ctx.font = ("bold 50px consolas");
    } else {
        fsm_ctx.font = ("50px consolas");
    }
    fsm_ctx.fillText("?", CW - 20, FCH - 20, 100);

    if (show_help_text) {
        fsm_ctx.font = ("40px consolas");
        fsm_ctx.fillStyle="gray";
        fsm_ctx.fillText("Need help? Click here! --->", CW / 2, CH - 40, CW);
    }
    fsm_ctx.restore();
}

function drawFSM() {
    fsmClear();
    drawEdges();
    drawNodes();
    drawHelp();
}

function fsmClear() {
    fsm_ctx.save();
    fsm_ctx.setTransform(1, 0.0, 0, 1, 0, 0);
    fsm_ctx.clearRect(0, 0, CW, FCH);
    fsm_ctx.restore();
}
