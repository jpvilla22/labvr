import * as THREE from 'three';
import { EventsDispacher } from './/EventsDispacher';

type handedness = "left" | "right";
const AXES_DEAD_ZONE = 0.4;


const buttonsMapping = {
    "left": [
        "Trigger",  //0
        "Grip",     //1
        null,       //2
        "Joystick", //3
        "ButtonX",  //4
        "ButtonY",  //5
        null,       //6
        null        //7
    ],
    "right": [
        "Trigger",  //0
        "Grip",     //1
        "Joystick", //3
        null,
        "ButtonA",  //4
        "ButtonB",  //5
        null,
        null
    ]
}

export enum EventTypes {
    ON_BUTTON_UP,
    ON_BUTTON_DOWN,
    ON_AXIS_CHANGED
}
/*
  //https://stackoverflow.com/questions/62476426/webxr-controllers-for-button-pressing-in-three-js
*/

export class XRGamepadMonitor extends EventsDispacher {

    private buttonsPreviousState: boolean[] = null;
    private axesPreviousState: number[] = null;
    private handedness: handedness;
    private xr: THREE.WebXRManager;

    constructor(xr: THREE.WebXRManager, handedness: handedness) {
        super();
        this.xr = xr;
        this.handedness = handedness;
    }

    private pollControllers() {
        let session = this.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            if (source && source.handedness && source.handedness == this.handedness) {

                if (!source.gamepad) return;
                this.pollButtons(source.gamepad);
                this.pollAxes(source.gamepad);

                //console.log(buttonsState)

            }

        }
    }

    private pollAxes(gamepad: Gamepad) {


        if (gamepad.axes.length >= 4) {
            if (this.axesPreviousState) {
                if (gamepad.axes[2] != this.axesPreviousState[2] ||
                    gamepad.axes[3] != this.axesPreviousState[3]) {

                    this.dispatchEvent({
                        "type": EventTypes.ON_AXIS_CHANGED,
                        "handedness": this.handedness,
                        "values": this.applyDeadZone(
                            [gamepad.axes[2], gamepad.axes[3]]
                        )
                    });

                }                
            }
            this.axesPreviousState = [...gamepad.axes];
        }

    }

    private applyDeadZone(values: number[]) {

        values.map((v, i) => {

            let x;
            if (v < 0) x = Math.min(0, v + AXES_DEAD_ZONE)
            else x = Math.max(0, v - AXES_DEAD_ZONE);
            return x;
        });
        return values;

    }

    private pollButtons(gamepad: Gamepad) {
        let buttonsState: boolean[] = gamepad.buttons.map((b: any) => b.pressed);

        buttonsState.forEach((state, i) => {

            if (
                this.buttonsPreviousState &&
                //buttonsMapping[this.handedness][i] != null &&
                this.buttonsPreviousState[i] === false &&
                state === true
            ) {

                this.dispatchEvent({
                    "type": EventTypes.ON_BUTTON_DOWN,
                    "index": i,
                    "button": buttonsMapping[this.handedness][i],
                    "hand": this.handedness
                });


            }

            if (
                this.buttonsPreviousState &&
                //buttonsMapping[this.handedness][i] != null &&
                this.buttonsPreviousState[i] === true &&
                state === false
            ) {

                this.dispatchEvent({
                    "type": EventTypes.ON_BUTTON_UP,
                    "index": i,
                    "button": buttonsMapping[this.handedness][i],
                    "hand": this.handedness
                });


            }
        })
        this.buttonsPreviousState = buttonsState;
    }

    update() {
        this.pollControllers();
    }

}

