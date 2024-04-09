import * as THREE from 'three'
import * as CANNON from 'cannon'

import * as init from '../game/init-three'
import * as object from '../game/object'
import HtmlPage from '../html-page/html-page'
import Bullet from './bullet'
import randomChoice from '../random.choice'

import AudioLoader from '../loader/audio';


export default class Player {
    velocity = 0.1
    jump_velocity = 4
    color = 0x00BB00
    health = 100
    max_health = 100
    size = [1, 2.4, 1]
    position = [-7, 10, 21]
    health_movement_intensity = 10

    camera_move_y = 0
    is_moving = false;

    mesh = new THREE.Mesh()
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    theta_camera = 0
    delta_camera = 0
    
    cannon_body: CANNON.Body | null = null
    
    angleX = THREE.MathUtils.degToRad(0)
    angleY = THREE.MathUtils.degToRad(0)
    quaternionX = new THREE.Quaternion()
    quaternionY =  new THREE.Quaternion()
    axisX = new THREE.Vector3(1, 0, 0)
    axisY = new THREE.Vector3(0, 1, 0)
    
    previous_health = this.health
    finalQuaternion = new THREE.Quaternion()
    
    enableCamera = false
    is_finish_load = false

    cursor_page = new HtmlPage("cursor-page")
    health_page = new HtmlPage("health-page")

    all_bullets: Array<Bullet> = []

    flash_light = new THREE.SpotLight(0xFF0000, 1)
    flash_light_object = new THREE.Object3D();

    audioLoader = new AudioLoader(this.camera);
    every_music: Array<THREE.Audio> = [];

    near_death_sound: THREE.Audio | null = null
    switch_weapons_sound: THREE.Audio | null = null
    empty_weapons_sound: THREE.Audio | null = null
    reload_weapons_sound: THREE.Audio | null = null

    set_sound() {
        this.audioLoader.loadSound("./assets/sound/nearDeath.mp3", false, 0.3, (loaded, sound) => {
            if (loaded && sound) {
                this.near_death_sound = sound;
            }
        });

        this.audioLoader.loadSound("./assets/sound/switchWeapon.mp3", false, 0.5, (loaded, sound) => {
            if (loaded && sound) {
                this.switch_weapons_sound = sound;
            }
        });

        this.audioLoader.loadSound("./assets/sound/empty-gun.mp3", false, 0.5, (loaded, sound) => {
            if (loaded && sound) {
                this.empty_weapons_sound = sound;
            }
        });

        this.audioLoader.loadSound("./assets/sound/reload-gun.mp3", false, 0.3, (loaded, sound) => {
            if (loaded && sound) {
                this.reload_weapons_sound = sound;
            }
        });
    }


    // load player body
    load() {
        this.set_three_box();
        this.set_cannon_collide_box();
        this.set_music();
        this.set_sound();
        this.set_flash_light();

        this.is_finish_load = true

        console.info("[load]:", "Player is loaded")
    }

    set_three_box() {
        const three_geometrie = new THREE.BoxGeometry(this.size[0], this.size[1], this.size[2]);
        const three_material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(three_geometrie, three_material);
        init.scene.add(this.mesh);
    }

    set_flash_light() {
        this.flash_light = new THREE.SpotLight(0xFF0000);

        this.flash_light.position.copy(this.camera.position)
        this.flash_light.intensity = 1
        this.flash_light.distance = 20;
        this.flash_light.angle = Math.PI / 3.5;
        this.flash_light.penumbra = 1;
        this.flash_light.decay = 1;
        this.flash_light.castShadow = true
        this.flash_light.shadow.mapSize.width = 1024;
        this.flash_light.shadow.mapSize.height = 1024;
        this.flash_light.shadow.camera.near = 500;
        this.flash_light.shadow.camera.far = 4000;
        this.flash_light.shadow.camera.fov = 30;

        this.flash_light.target = this.flash_light_object

        init.scene.add(this.flash_light)
        init.scene.add(this.flash_light_object)
    }

    set_cannon_collide_box() {
        const cannon_shape = new CANNON.Box(new CANNON.Vec3(
            this.size[0] / 2,
            this.size[1] / 2,
            this.size[2] / 2
        ));

        this.cannon_body = new CANNON.Body({ mass: 1, fixedRotation: true });
        this.cannon_body.position.set(this.position[0], this.position[1], this.position[2]);
        
        this.cannon_body.addShape(cannon_shape);
        init.cannon_world.addBody(this.cannon_body);
        this.mesh.position.copy(this.cannon_body.position);
    }

    set_music() {
        this.audioLoader.loadSound("./assets/sound/backgroundMusic.mp3", false, 0.5, (loaded, sound) => {
            if (loaded && sound) {
                this.every_music.push(sound)
            }
        });

        this.audioLoader.loadSound("./assets/sound/backgroundMusic2.mp3", false, 0.5, (loaded, sound) => {
            if (loaded && sound) {
                this.every_music.push(sound)
            }
        });

        this.audioLoader.loadSound("./assets/sound/backgroundMusic3.mp3", false, 0.5, (loaded, sound) => {
            if (loaded && sound) {
                this.every_music.push(sound)
            }
        });
    }

    update_music() {
        if (this.every_music.length !== 3) return
        let nothing_music_play = true;

        for (let m of this.every_music) {
            if (m.isPlaying) {
                nothing_music_play = false;
            }
        }

        if (nothing_music_play) {
            randomChoice(this.every_music)?.play()
        }
    }

    update_position() {
        if (this.cannon_body === null) return

        this.mesh.position.copy(this.cannon_body.position)
        this.mesh.quaternion.copy(this.cannon_body.quaternion)

        this.camera.position.set(
            this.cannon_body.position.x,
            this.cannon_body.position.y + 1 + Math.sin(1.5*this.camera_move_y) / this.health_movement_intensity,
            this.cannon_body.position.z,
        )

        this.flash_light.position.copy(this.camera.position)

        if (this.is_moving)
            this.camera_move_y += 0.1
    }


    isStartCamera() {
        const is_cursor_center_screen = (
            object.window_event.current_cursor_position[0] > (window.innerWidth / 2) - 10 &&
            object.window_event.current_cursor_position[0] < (window.innerWidth / 2) + 10 &&
            object.window_event.current_cursor_position[1] > (window.innerHeight / 2) - 10 &&
            object.window_event.current_cursor_position[1] < (window.innerHeight / 2) + 10
        )
        
        if (this.enableCamera) {return}
        
        this.cursor_page.searchHTML()
        
        if (init.activeCamera === init.camera) {
            this.cursor_page.disable()
            return
        }

        if (is_cursor_center_screen) {
            this.enableCamera = true
            this.cursor_page.disable()
        }

        else {
            this.cursor_page.enable()
        }
    }

    getDirection(): THREE.Vector3 {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.setY(0).normalize();
        return direction;
    }
    
    event() {
        const keyStates = object.window_event.key_states;
        const mouseStates = object.window_event.mouse_state;
        const direction = this.getDirection();

        if (keyStates["KeyW"])
            this.moveBodyAlongDirection(direction);
        else if (keyStates["KeyS"])
            this.moveBodyAlongDirection(direction.clone().negate());

        if (keyStates["KeyA"])
            this.moveBodyAlongDirection(new THREE.Vector3().crossVectors(this.camera.up, direction));
        
        else if (keyStates["KeyD"])
            this.moveBodyAlongDirection(new THREE.Vector3().crossVectors(this.camera.up, direction).negate());

        if (!keyStates["KeyW"] && !keyStates["KeyS"] && !keyStates["KeyA"] && !keyStates["KeyD"]) {
            this.is_moving = false
        }

        if (keyStates["KeyR"]) {
            if (object.gun.is_gun_loader) {
                object.gun.pistol_bullet_charge_now = object.gun.pistol_bullet_charge_max;
            } else {
                object.gun.riffle_bullet_charge_now = object.gun.riffle_bullet_charge_max;
            }
            
            this.reload_weapons_sound?.play()
        }

        if (mouseStates["left"]) {
            this.shoot()
        }

        object.gun.is_shooting_position = keyStates['Space']
    }

        
    moveBodyAlongDirection(direction: THREE.Vector3) {
        if (this.cannon_body === null) return

        const dir_pos = direction.multiplyScalar(this.velocity)

        this.cannon_body.position.x += dir_pos.x;
        this.cannon_body.position.z += dir_pos.z;

        this.is_moving = true
    }

    shoot() {
        if (object.gun.is_fire) return
        if (!this.cannon_body) return 

        const gunMesh = object.gun.mesh
        if (!gunMesh) return

        let gunUsed = false;

        if (object.gun.is_gun_loader) {
            if (object.gun.pistol_bullet_charge_now > 0) {
                object.gun.pistol_bullet_charge_now -= 1;
                object.gun.is_fire = true;
                object.gun.fire_backward = true;
                this.flash_light.intensity = 2;
                gunUsed = true;

                setTimeout(() => {
                    object.gun.is_fire = false;
                }, object.gun.pistol_fire_interval);
            }
        }

        else if (!object.gun.is_gun_loader) {
            if (object.gun.riffle_bullet_charge_now > 0) {
                object.gun.riffle_bullet_charge_now -= 1;
                object.gun.is_fire = true;
                object.gun.fire_backward = true;
                this.flash_light.intensity = 2;
                gunUsed = true;

                setTimeout(() => {
                    object.gun.is_fire = false;
                }, object.gun.riffle_fire_interval);
            }
        }

        if (gunUsed) {
            setTimeout(() => {
                object.gun.fire_backward = false;
                this.flash_light.intensity = 1;
            }, 100);

            const position = this.camera.position
            const direction = this.camera.getWorldDirection(new THREE.Vector3());

            let position_random = new THREE.Vector3(
                position.x, position.y, position.z
            )

            if (!object.gun.is_shooting_position) {
                const posX = randomChoice([-0.5, -0.3, 0, 0.3, 0.5])
                const posY = randomChoice([-0.5, -0.3, 0, 0.3, 0.5])

                position_random.x += posX ? posX: 0
                position_random.y += posY ? posY: 0
            }

            this.all_bullets.push(new Bullet([
                position_random.x,
                position_random.y,
                position_random.z,
            ], direction))

            this.audioLoader.loadSound("./assets/sound/fire.mp3", false, 1);
        }

        else {
            object.gun.fire_backward = true;

            setTimeout(() => {
                object.gun.fire_backward = false;
            }, 100);

            this.empty_weapons_sound?.play()
        }
    }

    jump() {
        this.cannon_body?.velocity.set(0, this.jump_velocity, 0)
    }

    updateFlashLightPosition() {
        const distance = 1;
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const ray = new THREE.Ray(this.camera.position, direction);
        const newPosition = ray.at(distance, new THREE.Vector3());

        this.flash_light_object.position.copy(newPosition);
    }

    moveHead() {
        if (!this.enableCamera) {
            return;
        }
    
        const { current_cursor_position, previous_cursor_position, cursor_sensibility, smooth_factor } = object.window_event;
        const delta_x = (current_cursor_position[0] - previous_cursor_position[0]) * cursor_sensibility * smooth_factor;
        const delta_y = (current_cursor_position[1] - previous_cursor_position[1]) * cursor_sensibility * smooth_factor;
    
        this.angleY -= THREE.MathUtils.degToRad(delta_x);
        this.angleX -= THREE.MathUtils.degToRad(delta_y);
        
        const max_angle_x = THREE.MathUtils.degToRad(60);
        const min_angle_x = -max_angle_x;
        this.angleX = THREE.MathUtils.clamp(this.angleX, min_angle_x, max_angle_x);
    
        this.quaternionY.setFromAxisAngle(this.axisY, this.angleY);
        this.quaternionX.setFromAxisAngle(this.axisX, this.angleX);
    
        this.finalQuaternion.multiplyQuaternions(this.quaternionY, this.quaternionX);
    
        this.camera.quaternion.copy(this.finalQuaternion);
    }

    respawn_after_death() {
        if (!this.cannon_body) return

        if (this.cannon_body.position.y < -5) {
            this.cannon_body.position.set(0, 10, 0)
        }
    }

    set_health_point(hp: number) {
        this.health_page.searchHTML()
        this.health_page.enable()
        const dom = this.health_page.dom_element
        if (!dom) return

        this.health += hp

        if (this.health < 0) {
            this.health = 0
            this.health_page.disable()
            init.change_game_running_to(false)
        }
        else if (this.health > this.max_health) {
            this.health = this.max_health
        }

        else if (this.health < this.max_health) {
            if (!this.near_death_sound?.isPlaying) {
                this.near_death_sound?.play()
            }
        }
        
        const health_percent = this.health / this.max_health;

        dom.style.opacity = (1 - health_percent).toString()
    }

    auto_regenerate() {
        if (this.previous_health === this.health && this.health < this.max_health) {
            this.set_health_point(+0.1)
        }
    }

    update_change_weapon_sound() {
        const wheel_event = object.window_event.wheel_states

        if (wheel_event.up || wheel_event.down) {
            if (!this.switch_weapons_sound?.isPlaying)
                this.switch_weapons_sound?.play();
            wheel_event.up = false;
            wheel_event.down = false;
            object.gun.switch_gun();
        }
    }


    update() {
        this.updateFlashLightPosition();
        this.update_position();

        this.auto_regenerate();
        this.update_music();

        this.update_change_weapon_sound();

        if (this.enableCamera) {
            this.event();
        }

        this.respawn_after_death();
        this.isStartCamera();
        
        this.all_bullets.forEach((bullet) => {bullet.update()});

        this.previous_health = this.health;
    }
}
