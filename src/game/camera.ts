import * as object from './object'
import * as init from './init-three'


export default function change_camera_event() {
    init.incIdx()
    
    const keyStates = object.window_event.key_states
    const keyType = "Enter"
    
    if (keyStates[keyType]) {
        keyStates[keyType] = false;
        init.switch_active_camera();
    }
}