// =====================================================
// RoboMorph micro:bit (MakeCode) — SINGLE CATEGORY (ORANGE)
// ONE toolbox category: "RoboMorph"
// Groups: Robotic Arm / Robot Dog / Otto Robot
//
// IMPORTANT CHANGE (as you requested):
// ✅ STOP command = STAND = set ALL 4 dog servos to 90°
// ✅ Stand action: all servos 90° (available via Dog move Stop OR Dog trick Stand)
//
// Dog Custom Angle:
// ✅ Still available: Dog set [leg] angle [°]
// ✅ Works with tricks (because tricks use Stop + then set angles)
// ✅ When you call Dog move Stop again -> it will re-center all to 90°
//
// Dog Movement:
// ✅ Forward/Backward/Left/Right logic unchanged (as per your screenshots)
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

    export function setPulseUs(channel: number, pulseUs: number) {
        if (!_inited) init(0x40, 50)
        let counts = Math.round(pulseUs * _freq * 4096 / 1000000)
        if (counts < 0) counts = 0
        if (counts > 4095) counts = 4095

        const reg = LED0_ON_L + 4 * channel
        const b = pins.createBuffer(5)
        b[0] = reg
        b[1] = 0
        b[2] = 0
        b[3] = counts & 0xFF
        b[4] = (counts >> 8) & 0xFF
        pins.i2cWriteBuffer(_addr, b)
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
    // Dropdown ports S1..S8 (S1=0 ... S8=7)
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
    // ROBOT DOG — 4 SERVOS
    // =====================================================
    export enum DogLeg {
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

    // ONE block dropdown for tricks
    export enum DogTrick {
        //% block="Stand"
        Stand = 0,
        //% block="Sit"
        Sit = 1,
        //% block="Handshake"
        Handshake = 2,
        //% block="Pee"
        Pee = 3,
        //% block="Dance"
        Dance = 4
    }

    // Default mapping: FL=S1, FR=S2, BL=S3, BR=S4
    let _dogCh: number[] = [0, 1, 2, 3]

    // Variables like your blocks
    let _FL = 90
    let _FR = 90
    let _BL = 90
    let _BR = 90

    const DOG_MIN = 60
    const DOG_MAX = 120

    let _dogAction: DogAction = DogAction.Stop
    let _dogLoopStarted = false
    let _dogSpeed = 1

    // This flag lets us hold a custom pose while action is Stop
    // BUT: calling Dog move Stop will ALWAYS clear this and center to 90 (as you requested).
    let _dogManualPose = false

    function dogApplyAngles() {
        // Same order you used in blocks: FL, BR, FR, BL
        writeServoAngle(_dogCh[DogLeg.FrontLeft], _FL)
        writeServoAngle(_dogCh[DogLeg.BackRight], _BR)
        writeServoAngle(_dogCh[DogLeg.FrontRight], _FR)
        writeServoAngle(_dogCh[DogLeg.BackLeft], _BL)
    }

    function dogSetAngles(fl: number, fr: number, bl: number, br: number) {
        _dogManualPose = true
        _FL = clamp(fl, 0, 180)
        _FR = clamp(fr, 0, 180)
        _BL = clamp(bl, 0, 180)
        _BR = clamp(br, 0, 180)
        dogApplyAngles()
    }

    function dogCenter90() {
        _dogManualPose = false
        _FL = 90; _FR = 90; _BL = 90; _BR = 90
        dogApplyAngles()
    }

    function dogEnterMode(m: DogAction) {
        _dogManualPose = false
        if (m == DogAction.Forward) {
            _FL = 60
            _BR = 110
            _FR = 80
            _BL = 110
        } else if (m == DogAction.Backward) {
            _FL = 120
            _BR = 70
            _FR = 100
            _BL = 70
        } else if (m == DogAction.Left || m == DogAction.Right) {
            _FL = 90; _FR = 90; _BL = 90; _BR = 90
        }
        dogApplyAngles()
    }

    function dogDelayMs(speed: number): number {
        // speed 1..5 -> 100..20 ms
        const s = clamp(speed, 1, 5)
        return 120 - (s * 20)
    }

    function dogTick() {
        if (_dogAction == DogAction.Stop) {
            // As you requested: Stop = Stand = ALL 90
            // If user is in a manual pose (from tricks/custom block), we keep it,
            // BUT when they call Dog move Stop, we clear manual pose and center.
            if (!_dogManualPose) {
                dogCenter90()
            } else {
                dogApplyAngles()
            }
            return
        }

        // Like your forever blocks:
        dogApplyAngles()

        if (_dogAction == DogAction.Forward) {
            // Forward: change by 5
            if (_FL > DOG_MAX) _FL = DOG_MIN
            else _FL += 5

            if (_BR < DOG_MIN) _BR = DOG_MAX
            else _BR -= 5

            if (_FR < DOG_MIN) _FR = DOG_MAX
            else _FR -= 5

            if (_BL > DOG_MAX) _BL = DOG_MIN
            else _BL += 5
        }
        else if (_dogAction == DogAction.Backward) {
            // Backward: change by 4
            if (_FL < DOG_MIN) _FL = DOG_MAX
            else _FL -= 4

            if (_BR > DOG_MAX) _BR = DOG_MIN
            else _BR += 4

            if (_FR > DOG_MAX) _FR = DOG_MIN
            else _FR += 4

            if (_BL < DOG_MIN) _BL = DOG_MAX
            else _BL -= 4
        }
        else if (_dogAction == DogAction.Left) {
            // Left: only FL & BL change by -2, FR/BR fixed 90
            _FR = 90
            _BR = 90

            if (_FL == DOG_MIN) _FL = DOG_MAX
            else _FL -= 2

            if (_BL == DOG_MIN) _BL = DOG_MAX
            else _BL -= 2
        }
        else if (_dogAction == DogAction.Right) {
            // Right: only FR & BR change by +2, FL/BL fixed 90
            _FL = 90
            _BL = 90

            if (_BR == DOG_MAX) _BR = DOG_MIN
            else _BR += 2

            if (_FR == DOG_MAX) _FR = DOG_MIN
            else _FR += 2
        }
    }

    function dogStartLoopOnce() {
        if (_dogLoopStarted) return
        _dogLoopStarted = true
        control.inBackground(function () {
            while (true) {
                dogTick()
                if (_dogAction == DogAction.Stop) basic.pause(20)
                else basic.pause(dogDelayMs(_dogSpeed))
            }
        })
    }

    //% group="Robot Dog"
    //% weight=100
    //% blockId="rm_dog_set_channel"
    //% block="Dog set channel of %leg to %port"
    export function dogSetChannel(leg: DogLeg, port: ServoPort) {
        _dogCh[leg] = port as number
    }

    //% group="Robot Dog"
    //% weight=90
    //% blockId="rm_dog_move"
    //% block="Dog move %action speed %speed"
    //% speed.min=0 speed.max=5
    export function dogMove(action: DogAction, speed: number) {
        // speed=0 => keep previous speed
        if (speed > 0) _dogSpeed = clamp(speed, 1, 5)

        _dogAction = action

        if (action == DogAction.Stop) {
            // STOP logic: immediately center to 90 (stand)
            dogCenter90()
        } else {
            // Moving actions: set start angles immediately (fixes fresh-start issues)
            dogEnterMode(action)
        }

        dogStartLoopOnce()
    }

    //% group="Robot Dog"
    //% weight=80
    //% blockId="rm_dog_set_leg_angle"
    //% block="Dog set %leg angle %angle °"
    //% angle.min=0 angle.max=180
    export function dogSetLegAngle(leg: DogLeg, angle: number) {
        // This is for making custom poses (it must NOT auto-center)
        _dogAction = DogAction.Stop
        _dogManualPose = true

        const a = clamp(angle, 0, 180)
        if (leg == DogLeg.FrontLeft) _FL = a
        else if (leg == DogLeg.FrontRight) _FR = a
        else if (leg == DogLeg.BackLeft) _BL = a
        else _BR = a

        dogApplyAngles()
        dogStartLoopOnce()
    }

    // ✅ ONE block for all tricks (dropdown)
    //% group="Robot Dog"
    //% weight=70
    //% blockId="rm_dog_trick"
    //% block="Dog trick %trick"
    export function dogTrick(trick: DogTrick) {
        if (trick == DogTrick.Stand) {
            dogMove(DogAction.Stop, 1) // Stand = Stop = all 90
            return
        }

        if (trick == DogTrick.Sit) {
            // SIT (your logic)
            _dogAction = DogAction.Stop
            dogSetAngles(100, 80, 25, 155)
            return
        }

        if (trick == DogTrick.Handshake) {
            // HANDSHAKE (your logic)
            dogMove(DogAction.Stop, 1) // stop included in your screenshot
            dogSetAngles(100, 80, 25, 155)
            basic.pause(1000)

            dogSetAngles(90, 180, 25, 130)
            basic.pause(1000)

            dogSetAngles(100, 80, 25, 155)
            basic.pause(1000)

            dogMove(DogAction.Stop, 1) // stop included in your screenshot
            return
        }

        if (trick == DogTrick.Pee) {
            // PEE (your logic)
            dogMove(DogAction.Stop, 1)
            basic.pause(200)

            // Dog set Front Left angle 30
            dogSetLegAngle(DogLeg.FrontLeft, 30)
            basic.pause(200)

            // Set pose
            dogSetAngles(30, 90, 90, 0)
            basic.pause(2000)

            dogMove(DogAction.Stop, 1) // stop included in your screenshot
            return
        }

        // DANCE (your logic)
        _dogAction = DogAction.Stop
        _dogManualPose = true

        for (let i = 0; i < 5; i++) {
            dogSetAngles(60, 60, 60, 60)
            basic.pause(200)

            dogSetAngles(120, 120, 120, 120)
            basic.pause(200)
        }

        // stop speed 0 (your screenshot) -> and stop must center 90
        dogMove(DogAction.Stop, 0)
    }

    // =====================================================
    // OTTO ROBOT (minimal)
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
}