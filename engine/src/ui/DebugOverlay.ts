export class DebugOverlay {
    private debugDiv: HTMLDivElement;

    constructor() {
        this.debugDiv = document.createElement("div");
        this.debugDiv.style.position = "absolute";
        this.debugDiv.style.top = "10px";
        this.debugDiv.style.left = "10px";
        this.debugDiv.style.color = "white";
        this.debugDiv.style.fontFamily = "monospace";
        this.debugDiv.style.zIndex = "100";
        this.debugDiv.style.pointerEvents = "none";
        document.body.appendChild(this.debugDiv);
    }

    public log(msg: string) {
        this.debugDiv.innerHTML += msg + "<br/>";
        console.log(msg); // Also log to real console
    }
}
