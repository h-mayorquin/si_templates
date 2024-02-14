import React, { useState, useEffect, useRef } from "react";
import Plot from "plotly.js-dist";
import { openGroup, HTTPStore } from "zarr";
import "../styles/App.css";
import calculatePeakToPeakValues from "../utils/CalculationUtils";

import ProbePlot from "./ProbePlot";
import SingleTemplatePlot from "./SingleTemplatePlot";

const percentageToFilterChannels = 0.1;

function App() {
  const s3Url = "https://spikeinterface-template-database.s3.us-east-2.amazonaws.com/test_templates";
  const storeRef = useRef(null); // Don't recreate the store on every render
  const zarrGroupRef = useRef(null);
  const probeGroupRef = useRef(null);
  let template_index = 5;

  const [isLoading, setIsLoading] = useState(true);
  const [templateArray, setTemplateArray] = useState(null);
  const [probeXCoordinates, setProbeXCoordinates] = useState([]);
  const [probeYCoordinates, setProbeYCoordinates] = useState([]);
  const [location, setLocation] = useState([0, 0]);
  const [samplingFrequency, setSamplingFrequency] = useState(null);
  const [activeIndices, setActiveIndices] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!storeRef.current) {
        storeRef.current = new HTTPStore(s3Url);
      }

      try {
        if (!zarrGroupRef.current) {
          zarrGroupRef.current = await openGroup(storeRef.current);
        }
        if (!probeGroupRef.current) {
          probeGroupRef.current = await openGroup(storeRef.current, "probe", "r");
        }
        // Get sampling frequency
        const attributes = await zarrGroupRef.current.attrs.asObject();
        setSamplingFrequency(attributes["sampling_frequency"]);

        // get probe data
        const xCoords_object = await probeGroupRef.current.getItem("x");
        const yCoords_object = await probeGroupRef.current.getItem("y");
        const xCoords = await xCoords_object.get(null);
        const yCoords = await yCoords_object.get(null);
        const xCoordsData = xCoords.data;
        const yCoordsData = yCoords.data;

        setProbeXCoordinates(xCoordsData);
        setProbeYCoordinates(yCoordsData);

        // get template data
        const _templateArray = await zarrGroupRef.current.getItem("templates_array");
        setTemplateArray(_templateArray);

        // Get template location
        const singleTemplate = await _templateArray.get([template_index, null, null]);
        const peakToPeakValues = calculatePeakToPeakValues(singleTemplate);
        const bestChannel = peakToPeakValues.indexOf(Math.max(...peakToPeakValues));
        const bestChannelPeakToPeak = peakToPeakValues[bestChannel];

        const numberOfChannels = await singleTemplate.shape[1];
        const _activeIndices = [];
        // iterate over the number of channels and find those whose peak to peak values are greater than the best channel
        for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
          const channelPeakToPeak = peakToPeakValues[channelIndex];
          if (channelPeakToPeak >= bestChannelPeakToPeak * percentageToFilterChannels) {
            if (channelIndex === bestChannel) {
              continue;
            }
            _activeIndices.push(channelIndex);
          }
        }
        setActiveIndices(_activeIndices);

        const locationX = xCoordsData[bestChannel];
        const locationY = yCoordsData[bestChannel];
        setLocation([locationX, locationY]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // an empty dependency array means this effect will only run once

  return (
    <div className="App">
      <h2>Template plots</h2>
      {!isLoading && templateArray ? (
        <div className="plotsContainer">
          <SingleTemplatePlot
            template_index={template_index}
            templateArray={templateArray}
            samplingFrequency={samplingFrequency}
          />
          <ProbePlot
            xCoordinates={probeXCoordinates}
            yCoordinates={probeYCoordinates}
            location={location}
            activeIndices={activeIndices}
          />
        </div>
      ) : (
        <div>Loading template data...</div>
      )}
    </div>
  );
}

export default App;
