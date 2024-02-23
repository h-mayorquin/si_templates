import React, { useState, useEffect } from 'react';
import { HTTPStore } from 'zarr';
import SingleTemplatePlot from './SingleTemplatePlot';
import ProbePlot from './ProbePlot';
import DataTablePlot from './DataTablePlot';
import { openGroup } from 'zarr';
import calculatePeakToPeakValues from '../utils/CalculationUtils';
import { percentageToFilterChannels } from '../styles/StyleConstants';
import '../styles/App.css';

function App() {
  const s3Url = 'https://spikeinterface-template-database.s3.us-east-2.amazonaws.com/test_templates';
  const storeRef = new HTTPStore(s3Url); // Assuming this is correct for your setup
  const [templateIndices, setTemplateIndices] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const batchSize = 15; // Number of templates to load per batch

  const loadTemplates = () => {
    const nextIndex = templateIndices.length === 0 ? 0 : Math.max(...templateIndices) + 1;
    const newIndices = Array.from({ length: batchSize }, (_, i) => i + nextIndex);
    
    setTemplateIndices(prevIndices => [...new Set([...prevIndices, ...newIndices])]); // Use a Set to ensure uniqueness, just in case
    
    if (nextIndex + batchSize >= 100) { // Adjust this condition based on actual data availability
      setHasMore(false);
    }
  };

  // Load the initial templates when the component mounts
  useEffect(() => {
    loadTemplates();
  }, []);


  return (
    <div className="App">
      <h2>Template plots</h2>
      <div className="ColumnPlotContainer">
        {templateIndices.map((templateIndex) => (
          <RowPlotContainer key={templateIndex} templateIndex={templateIndex} storeRef={storeRef} />
        ))}
      </div>
      {hasMore && (
        <button onClick={loadTemplates} className="load-more-button">
          Load More Templates
        </button>
      )}
    </div>
  );
}

export default App;

const RowPlotContainer = ({ templateIndex, storeRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [probeXCoordinates, setProbeXCoordinates] = useState([]);
  const [probeYCoordinates, setProbeYCoordinates] = useState([]);
  const [location, setLocation] = useState([0, 0]);
  const [samplingFrequency, setSamplingFrequency] = useState(null);
  const [activeIndices, setActiveIndices] = useState([]);
  const [templateArray, setTemplateArray] = useState([]);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const zarrGroup = await openGroup(storeRef);
        const probeGroup = await openGroup(storeRef, "probe", "r");

        // Fetch sampling frequency
        const attributes = await zarrGroup.attrs.asObject();
        setSamplingFrequency(attributes["sampling_frequency"]);

        // Fetch probe data
        const xCoords = await probeGroup.getItem("x").then((data) => data.get(null));
        const yCoords = await probeGroup.getItem("y").then((data) => data.get(null));
        setProbeXCoordinates(xCoords.data);
        setProbeYCoordinates(yCoords.data);

        // Fetch template data for a specific index
        const templateArray = await zarrGroup.getItem("templates_array");
        setTemplateArray(templateArray);
        const singleTemplate = await templateArray.get([templateIndex, null, null]);
        const peakToPeakValues = calculatePeakToPeakValues(singleTemplate);
        const bestChannel = peakToPeakValues.indexOf(Math.max(...peakToPeakValues));

        // Active indices calculation
        const _activeIndices = peakToPeakValues
          .map((value, index) => (value >= peakToPeakValues[bestChannel] * percentageToFilterChannels ? index : null))
          .filter((index) => index !== null);
        setActiveIndices(_activeIndices);

        // Set table data (mockup or real)
        const data = [
          { attribute: "Number of Samples", value: "855" },
          { attribute: "STD", value: "1.10" },
          { attribute: "Brain Location", value: "Hippocampus" },
        ];
        setTableData(data);

        // Set location based on best channel
        const locationX = xCoords.data[bestChannel];
        const locationY = yCoords.data[bestChannel];
        setLocation([locationX, locationY]);

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data for template index " + templateIndex + ":", error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [templateIndex, storeRef]); // Dependency array to ensure re-fetching when these values change

  if (isLoading) {
    return <div>Loading data for template {templateIndex}...</div>;
  }

  return (
    <div className="RowPlotContainer">
      <SingleTemplatePlot
        templateIndex={templateIndex}
        templateArray={templateArray}
        probeXCoordinates={probeXCoordinates}
        probeYCoordinates={probeYCoordinates}
        activeIndices={activeIndices}
        samplingFrequency={samplingFrequency}
      />
      <ProbePlot
        templateIndex={templateIndex}
        xCoordinates={probeXCoordinates}
        yCoordinates={probeYCoordinates}
        location={location}
        activeIndices={activeIndices}
      />
      <DataTablePlot tableData={tableData} />
    </div>
  );
};
