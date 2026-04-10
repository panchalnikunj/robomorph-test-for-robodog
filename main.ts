// =====================================================
// RoboMorph micro:bit (MakeCode) — SINGLE CATEGORY (ORANGE)
// ONE toolbox category: "RoboMorph"
// Groups: Robotic Arm / Robot Dog / Otto Robot
//
// Robot Dog (4 servos) movement:
// ✅ ONE block: Dog move [Forward/Backward/Left/Right/Stop] speed (1..5)
// ✅ Runs forever until you change action
// ✅ Forward = your 1st image logic
// ✅ Backward/Left/Right = EXACT logic from your latest image
// =====================================================

//% blockHidden=true
namespace _PCA9685 {
    let _addr = 0x40
    let _freq = 50
    let _inited = false

    const MODE1 = 0x00
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06

    function write8(reg: number, val: number): void {
        const b = pins.createBuffer(2)
        b[0] = reg
        b[1] = val
        pins.i2cWriteBuffer(_addr, b)
    }

    function read8(reg: number): number {
        pins.i2cWriteNumber(_addr, reg, NumberFormat.UInt8BE, true)
        return pins.i2cReadNumber(_addr, NumberFormat.UInt8BE, false)
    }

    function setPWMFreq(freq: number) {
        let prescaleval = 25000000
        prescaleval = prescaleval / 4096
        prescaleval = prescaleval / freq
        prescaleval = prescaleval - 1
        const prescale = Math.floor(prescaleval + 0.5)

        const oldmode = read8(MODE1)
        const sleep = (oldmode & 0x7F) | 0x10
        write8(MODE1, sleep)
        write8(PRESCALE, prescale)
        write8(MODE1, oldmode)
        basic.pause(5)
        write8(MODE1, oldmode | 0xA1) // restart + auto-increment
    }

    export function init(addr: number = 0x40, freqHz: number = 50) {
        _addr = addr
        _freq = freqHz
        write8(MODE1, 0x00)
        setPWMFreq(freqHz)
        _inited = true
    }

    export function setPWM(channel: number, on: number, off: number) {
        if (!_inited) init(0x40, 50)
        const reg = LED0_ON_L + 4 * channel
        const b = pins.createBuffer(5)
        b[0] = reg
        b[1] = on & 0xFF
        b[2] = (on >> 8) & 0xFF
        b[3] = off & 0xFF
        b[4] = (off >> 8) & 0xFF
        pins.i2cWriteBuffer(_addr, b)
    }

    export function setPulseUs(channel: number, pulseUs: number) {
        if (!_inited) init(0x40, 50)
        let counts = Math.round(pulseUs * _freq * 4096 / 1000000)
        if (counts < 0) counts = 0
        if (counts > 4095) counts = 4095
        setPWM(channel, 0, counts)
    }
}

//% color=#FF6F00 icon="\uf0b1" block="RoboMorph"
//% groups=['Robotic Arm','Robot Dog','Otto Robot']
namespace RoboMorph {

    // -------------------------
    // Shared (hidden) servo helper
    // -------------------------
    const SERVO_MIN_US = 500
    const SERVO_MAX_US = 2500

    function clamp(v: number, lo: number, hi: number) {
        return Math.max(lo, Math.min(hi, v))
    }

    function writeServoAngle(ch: number, angle: number) {
        const a = clamp(angle, 0, 180)
        const pulse = SERVO_MIN_US + (a * (SERVO_MAX_US - SERVO_MIN_US)) / 180
        _PCA9685.setPulseUs(ch, pulse)
    }

    // =====================================================
    // Dropdown ports S1..S8  (S1=0 ... S8=7)
    // =====================================================
    export enum ServoPort {
        //% block="S1"
        S1 = 0,
        //% block="S2"
        S2 = 1,
        //% block="S3"
        S3 = 2,
        //% block="S4"
        S4 = 3,
        //% block="S5"
        S5 = 4,
        //% block="S6"
        S6 = 5,
        //% block="S7"
        S7 = 6,
        //% block="S8"
        S8 = 7
    }

    // =====================================================
    // ROBOTIC ARM (unchanged)
    // =====================================================
    export enum ArmJoint {
        //% block="Base"
        Base = 0,
        //% block="Shoulder"
        Shoulder = 1,
        //% block="Elbow"
        Elbow = 2,
        //% block="Wrist"
        Wrist = 3,
        //% block="Gripper"
        Gripper = 4,
        //% block="Extra 1"
        Extra1 = 5,
        //% block="Extra 2"
        Extra2 = 6,
        //% block="Extra 3"
        Extra3 = 7
    }

    export enum ArmPose {
        //% block="Home"
        Home = 0,
        //% block="Pick"
        Pick = 1,
        //% block="Place"
        Place = 2,
        //% block="Wave"
        Wave = 3
    }

    let _armCh: number[] = [0, 1, 2, 3, 4, 5, 6, 7]

    //% group="Robotic Arm"
    //% weight=100
    //% blockId="rm_arm_set_channel"
    //% block="Arm set channel of %joint to %port"
    export function armSetChannel(joint: ArmJoint, port: ServoPort) {
        _armCh[joint] = port as number
    }

    //% group="Robotic Arm"
    //% weight=90
    //% blockId="rm_arm_set_angle"
    //% block="Arm set %joint angle %angle °"
    //% angle.min=0 angle.max=180
    export function armSetAngle(joint: ArmJoint, angle: number) {
        writeServoAngle(_armCh[joint], angle)
    }

    //% group="Robotic Arm"
    //% weight=80
    //% blockId="rm_arm_pose"
    //% block="Arm pose %pose"
    export function armPose(pose: ArmPose) {
        if (pose == ArmPose.Home) {
            armSetAngle(ArmJoint.Base, 90)
            armSetAngle(ArmJoint.Shoulder, 90)
            armSetAngle(ArmJoint.Elbow, 90)
            armSetAngle(ArmJoint.Wrist, 90)
            armSetAngle(ArmJoint.Gripper, 60)
        } else if (pose == ArmPose.Pick) {
            armSetAngle(ArmJoint.Base, 90)
            armSetAngle(ArmJoint.Shoulder, 120)
            armSetAngle(ArmJoint.Elbow, 60)
            armSetAngle(ArmJoint.Wrist, 90)
            armSetAngle(ArmJoint.Gripper, 20)
        } else if (pose == ArmPose.Place) {
            armSetAngle(ArmJoint.Base, 120)
            armSetAngle(ArmJoint.Shoulder, 110)
            armSetAngle(ArmJoint.Elbow, 70)
            armSetAngle(ArmJoint.Wrist, 90)
            armSetAngle(ArmJoint.Gripper, 80)
        } else {
            armSetAngle(ArmJoint.Base, 90)
            armSetAngle(ArmJoint.Shoulder, 80)
            armSetAngle(ArmJoint.Elbow, 120)
            armSetAngle(ArmJoint.Wrist, 60)
            basic.pause(200)
            armSetAngle(ArmJoint.Wrist, 120)
            basic.pause(200)
            armSetAngle(ArmJoint.Wrist, 60)
        }
    }

    //% group="Robotic Arm"
    //% weight=70
    //% blockId="rm_arm_gripper_bool"
    //% block="Arm gripper open %open"
    export function armGripper(open: boolean) {
        armSetAngle(ArmJoint.Gripper, open ? 80 : 20)
    }

    // =====================================================
    // ROBOT DOG — 4 SERVOS + ONE MOVE BLOCK (FOREVER)
    // Backward/Left/Right logic updated EXACTLY from your image
    // =====================================================
    export enum DogServo {
        //% block="Front Left"
        FrontLeft = 0,
        //% block="Front Right"
        FrontRight = 1,
        //% block="Back Left"
        BackLeft = 2,
        //% block="Back Right"
        BackRight = 3
    }

    export enum DogAction {
        //% block="Stop"
        Stop = 0,
        //% block="Forward"
        Forward = 1,
        //% block="Backward"
        Backward = 2,
        //% block="Left"
        Left = 3,
        //% block="Right"
        Right = 4
    }

    // default mapping: FL=S1, FR=S2, BL=S3, BR=S4
    let _dogCh: number[] = [0, 1, 2, 3]

    // gait state angles (same variable meaning as your blocks)
    let _FL = 90
    let _FR = 90
    let _BL = 90
    let _BR = 90

    const DOG_MIN = 60
    const DOG_MAX = 120

    let _dogAction: DogAction = DogAction.Stop
    let _dogPrevAction: DogAction = DogAction.Forward // force enter first time
    let _dogSpeed = 1
    let _dogLoopStarted = false

    function dogApplyAngles() {
        // same order you used:
        // Front Left -> FL
        // Back Right  -> BR
        // Front Right -> FR
        // Back Left   -> BL
        writeServoAngle(_dogCh[DogServo.FrontLeft], _FL)
        writeServoAngle(_dogCh[DogServo.BackRight], _BR)
        writeServoAngle(_dogCh[DogServo.FrontRight], _FR)
        writeServoAngle(_dogCh[DogServo.BackLeft], _BL)
    }

    function dogEnterMode(m: DogAction) {
        // initial values exactly like your screenshots
        if (m == DogAction.Forward) {
            // (your forward start from image 1)
            _FL = 60
            _BR = 110
            _FR = 80
            _BL = 110
        } else if (m == DogAction.Backward) {
            // (your backward start from latest image)
            _FL = 120
            _BR = 70
            _FR = 100
            _BL = 70
        } else {
            // Left / Right / Stop start with all 90 (as in image)
            _FL = 90; _FR = 90; _BL = 90; _BR = 90
        }
        dogApplyAngles()
    }

    function dogDelayMs(speed: number): number {
        // speed 1..5 -> 50..10 ms
        const s = clamp(speed, 1, 5)
        return 60 - (s * 10)
    }

    function dogTick() {
        if (_dogAction != _dogPrevAction) {
            dogEnterMode(_dogAction)
            _dogPrevAction = _dogAction
        }

        const s = clamp(_dogSpeed, 1, 5)
        const stepF = 4 * s   // base change by 4
        const stepT = 2 * s   // base change by 2

        if (_dogAction == DogAction.Stop) {
            dogApplyAngles()
            return
        }

        // Always apply current angles first (exactly like your forever loops)
        dogApplyAngles()

        if (_dogAction == DogAction.Forward) {
            // FORWARD (image 1)
            if (_FL > DOG_MAX) _FL = DOG_MIN
            else _FL += stepF

            if (_BR < DOG_MIN) _BR = DOG_MAX
            else _BR -= stepF

            if (_FR < DOG_MIN) _FR = DOG_MAX
            else _FR -= stepF

            if (_BL > DOG_MAX) _BL = DOG_MIN
            else _BL += stepF
        }
        else if (_dogAction == DogAction.Backward) {
            // BACKWARD (latest image)
            if (_FL < DOG_MIN) _FL = DOG_MAX
            else _FL -= stepF

            if (_BR > DOG_MAX) _BR = DOG_MIN
            else _BR += stepF

            if (_FR > DOG_MAX) _FR = DOG_MIN
            else _FR += stepF

            if (_BL < DOG_MIN) _BL = DOG_MAX
            else _BL -= stepF
        }
        else if (_dogAction == DogAction.Left) {
            // LEFT (latest image)
            // Keep right side fixed at 90 like your blocks
            _FR = 90
            _BR = 90

            // Your blocks used "== 60", but with speed>1 you can skip 60.
            // Using <= keeps it working for speed 1..5 while matching the same behavior.
            if (_FL <= DOG_MIN) _FL = DOG_MAX
            else _FL -= stepT

            if (_BL <= DOG_MIN) _BL = DOG_MAX
            else _BL -= stepT
        }
        else if (_dogAction == DogAction.Right) {
            // RIGHT (latest image)
            // Keep left side fixed at 90 like your blocks
            _FL = 90
            _BL = 90

            // Your blocks used "== 120", but with speed>1 you can skip 120.
            // Using >= keeps it working for speed 1..5 while matching the same behavior.
            if (_BR >= DOG_MAX) _BR = DOG_MIN
            else _BR += stepT

            if (_FR >= DOG_MAX) _FR = DOG_MIN
            else _FR += stepT
        }
    }

    function dogStartLoopOnce() {
        if (_dogLoopStarted) return
        _dogLoopStarted = true
        control.inBackground(function () {
            while (true) {
                dogTick()
                basic.pause(dogDelayMs(_dogSpeed))
            }
        })
    }

    //% group="Robot Dog"
    //% weight=100
    //% blockId="rm_dog_set_channel_4"
    //% block="Dog set channel of %servo to %port"
    export function dogSetChannel(servo: DogServo, port: ServoPort) {
        _dogCh[servo] = port as number
    }

    //% group="Robot Dog"
    //% weight=90
    //% blockId="rm_dog_set_angle_4"
    //% block="Dog set %servo angle %angle °"
    //% angle.min=0 angle.max=180
    export function dogSetAngle(servo: DogServo, angle: number) {
        writeServoAngle(_dogCh[servo], angle)
    }

    // ✅ ONE BLOCK (forever)
    //% group="Robot Dog"
    //% weight=80
    //% blockId="rm_dog_move_forever"
    //% block="Dog move %action speed %speed"
    //% speed.min=1 speed.max=5
    export function dogMove(action: DogAction, speed: number) {
        _dogSpeed = clamp(speed, 1, 5)
        _dogAction = action
        dogStartLoopOnce()
    }

    // =====================================================
    // OTTO ROBOT (kept same)
    // =====================================================
    export enum OttoServo {
        //% block="Left Hip"
        LH = 0,
        //% block="Right Hip"
        RH = 1,
        //% block="Left Foot"
        LF = 2,
        //% block="Right Foot"
        RF = 3
    }

    export enum OttoPose {
        //% block="Home"
        Home = 0
    }

    let _ottoCh: number[] = [0, 1, 2, 3]

    //% group="Otto Robot"
    //% weight=100
    //% blockId="rm_otto_set_channel"
    //% block="Otto set channel of %servo to %port"
    export function ottoSetChannel(servo: OttoServo, port: ServoPort) {
        _ottoCh[servo] = port as number
    }

    //% group="Otto Robot"
    //% weight=90
    //% blockId="rm_otto_set_angle"
    //% block="Otto set %servo angle %angle °"
    //% angle.min=0 angle.max=180
    export function ottoSetAngle(servo: OttoServo, angle: number) {
        writeServoAngle(_ottoCh[servo], angle)
    }

    //% group="Otto Robot"
    //% weight=80
    //% blockId="rm_otto_pose"
    //% block="Otto pose %pose"
    export function ottoPose(pose: OttoPose) {
        ottoSetAngle(OttoServo.LH, 90)
        ottoSetAngle(OttoServo.RH, 90)
        ottoSetAngle(OttoServo.LF, 90)
        ottoSetAngle(OttoServo.RF, 90)
    }

    //% group="Otto Robot"
    //% weight=70
    //% blockId="rm_otto_walk_bool"
    //% block="Otto walk forward %forward steps %steps speed %speed"
    //% steps.min=1 steps.max=200 speed.min=1 speed.max=10
    export function ottoWalk(forward: boolean, steps: number, speed: number) {
        const s = clamp(speed, 1, 10)
        const t = Math.idiv(200, s) + 10

        for (let i = 0; i < steps; i++) {
            if (forward) {
                ottoSetAngle(OttoServo.LH, 80); ottoSetAngle(OttoServo.RH, 100)
                ottoSetAngle(OttoServo.LF, 70); ottoSetAngle(OttoServo.RF, 110)
                basic.pause(t)

                ottoSetAngle(OttoServo.LH, 100); ottoSetAngle(OttoServo.RH, 80)
                ottoSetAngle(OttoServo.LF, 110); ottoSetAngle(OttoServo.RF, 70)
                basic.pause(t)
            } else {
                ottoSetAngle(OttoServo.LH, 80); ottoSetAngle(OttoServo.RH, 100)
                ottoSetAngle(OttoServo.LF, 110); ottoSetAngle(OttoServo.RF, 70)
                basic.pause(t)

                ottoSetAngle(OttoServo.LH, 100); ottoSetAngle(OttoServo.RH, 80)
                ottoSetAngle(OttoServo.LF, 70); ottoSetAngle(OttoServo.RF, 110)
                basic.pause(t)
            }
        }
        ottoPose(OttoPose.Home)
    }
}