import "agentview/styles.css";
import { renderStudio } from "agentview";
import agentviewConfig from "@examples/ts-basic/studio/agentview.config";

renderStudio(
    document.getElementById("agentview"), 
    agentviewConfig
);