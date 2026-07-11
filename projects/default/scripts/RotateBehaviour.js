/**
 * :wk-id: rotate-behaviour
 * :wk-tags: script, rotate, rotation, behavior
 * :wk-categories: system-architecture
 *
 * Rotation behavior script for AIAR custom entities. Rotates the attached node by speed around axis.
 */
export default class RotateBehaviour {
    constructor(node, properties) {
        this.node = node;
        this.speed = properties.speed || 1.0;
        this.axis = properties.axis || [0, 1, 0];
    }

    Start() {
        console.log(`[RotateBehaviour] Started on ${this.node.name}`);
    }

    Update(deltaTime) {
        if (!this.node || !this.node.rotation) return;
        
        // deltaTime is in seconds
        const deltaRot = this.speed * deltaTime;
        
        this.node.rotation.x += this.axis[0] * deltaRot;
        this.node.rotation.y += this.axis[1] * deltaRot;
        this.node.rotation.z += this.axis[2] * deltaRot;
    }

    OnEnable() {
        console.log(`[RotateBehaviour] Enabled on ${this.node.name}`);
    }

    OnDisable() {
        console.log(`[RotateBehaviour] Disabled on ${this.node.name}`);
    }

    OnDestroy() {
        console.log(`[RotateBehaviour] Destroyed on ${this.node.name}`);
    }
}
