import "./styles.css";
import { renderStudio } from "agentview";

// @ts-ignore
import agentviewConfig from "@examples/ts-basic/studio/agentview.config";

renderStudio(
    document.getElementById("agentview"), 
    agentviewConfig
);