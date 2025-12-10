import "./styles.css";
import { renderStudio } from "./renderStudio";

// @ts-ignore
import agentviewConfig from "@examples/ts-basic/studio/agentview.config";

renderStudio(
    document.getElementById("agentview"), 
    agentviewConfig
);