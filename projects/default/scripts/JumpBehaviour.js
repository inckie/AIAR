export default class JumpBehaviour {
    constructor(node, properties) {
        this.node = node;
        this.properties = properties;
        this.isJumping = false;
        this.jumpTime = 0;
        this.duration = 1.0; // 1 second jump
        
        // Save initial states so we can return to them
        this.initialPosition = node.position.clone();
        this.initialRotation = node.rotation.clone();
        this.initialScaling = node.scaling.clone();
    }

    OnClick() {
        if (this.isJumping) return;
        this.isJumping = true;
        this.jumpTime = 0;
    }
    
    Update(deltaTime) {
        if (!this.isJumping) return;
        
        this.jumpTime += deltaTime;
        let t = this.jumpTime / this.duration;
        
        if (t >= 1.0) {
            t = 1.0;
            this.isJumping = false;
        }
        
        // Smooth step function for easing spin
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; 
        
        // 1. Jump up and down (Y axis translation)
        // Parabola: y = 4 * h * t * (1 - t)
        const jumpHeight = 2.0;
        this.node.position.y = this.initialPosition.y + 4 * jumpHeight * t * (1 - t);
        
        // 2. Spin (Y axis rotation)
        this.node.rotation.y = this.initialRotation.y + ease * Math.PI * 2;
        
        // 3. Squash and Stretch (Scaling)
        let scaleY = 1.0;
        let scaleXZ = 1.0;
        
        if (t < 0.1) {
            // 0 -> 0.1: squash to 0.7
            const st = t / 0.1;
            scaleY = 1.0 - 0.3 * Math.sin(st * Math.PI / 2);
            scaleXZ = 1.0 + 0.3 * Math.sin(st * Math.PI / 2);
        } else if (t < 0.5) {
            // 0.1 -> 0.5: stretch to 1.3
            const st = (t - 0.1) / 0.4;
            scaleY = 0.7 + 0.6 * Math.sin(st * Math.PI / 2);
            scaleXZ = 1.3 - 0.6 * Math.sin(st * Math.PI / 2);
        } else if (t < 0.9) {
            // 0.5 -> 0.9: squash to 0.7
            const st = (t - 0.5) / 0.4;
            scaleY = 1.3 - 0.6 * Math.sin(st * Math.PI / 2);
            scaleXZ = 0.7 + 0.6 * Math.sin(st * Math.PI / 2);
        } else {
            // 0.9 -> 1.0: return to 1.0
            const st = (t - 0.9) / 0.1;
            scaleY = 0.7 + 0.3 * Math.sin(st * Math.PI / 2);
            scaleXZ = 1.3 - 0.3 * Math.sin(st * Math.PI / 2);
        }
        
        this.node.scaling.x = this.initialScaling.x * scaleXZ;
        this.node.scaling.y = this.initialScaling.y * scaleY;
        this.node.scaling.z = this.initialScaling.z * scaleXZ;
        
        if (!this.isJumping) {
            // Reset to exact initial states at the end
            this.node.position.copyFrom(this.initialPosition);
            this.node.rotation.copyFrom(this.initialRotation);
            this.node.scaling.copyFrom(this.initialScaling);
        }
    }
}
