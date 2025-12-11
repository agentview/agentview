import "./styles.css";
import { renderStudio } from "@agentview/studio";
import agentviewConfig from "./agentview.config";

renderStudio(
    document.getElementById("agentview"), 
    agentviewConfig
);