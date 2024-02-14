import React, { useState, useEffect, useRef} from 'react';
import Plot from 'plotly.js-dist';
import { openGroup, HTTPStore } from 'zarr';
import './App.css';

const bestChannelColor = '#5e919e';
const activeChannelsColor = '#add3dc';
const percentageToFilterChannels = 0.10;
const plotFont = {
  family: 'Arial, sans-serif',
  size: 12,
  color: '#7f7f7f'
}


function App() {
  const s3Url = 'https://spikeinterface-template-database.s3.us-east-2.amazonaws.com/test_templates';
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
        const xCoords_object = await probeGroupRef.current.getItem("x")
        const yCoords_object = await probeGroupRef.current.getItem("y")
        const xCoords = await xCoords_object.get(null)
        const yCoords = await yCoords_object.get(null)
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
          const channelPeakToPeak = peakToPeakValues[channelIndex]
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
          <SingleTemplatePlot template_index={template_index} templateArray={templateArray} samplingFrequency={samplingFrequency} />
          <ProbePlot xCoordinates={probeXCoordinates} yCoordinates={probeYCoordinates} location={location} activeIndices={activeIndices} />
        </div>
      ) : (
        <div>Loading template data...</div>
      )}
    </div>
  );
}

function ProbePlot({ xCoordinates, yCoordinates, location, activeIndices}) {
  const x_location = location[0];
  const y_location = location[1];

  let activeLocationsX = [];
  let activeLocationsY = [];
  for (const channelIndex of activeIndices) {
    activeLocationsX.push(xCoordinates[channelIndex]);
    activeLocationsY.push(yCoordinates[channelIndex]);
  }

  const minX = Math.min(...xCoordinates);
  const maxX = Math.max(...xCoordinates);
  const minY = Math.min(...yCoordinates);
  const maxY = Math.max(...yCoordinates);

  useEffect(() => {
    const plotData = [
      // Marker for a specific location
      {
        x: [x_location],
        y: [y_location],
        type: 'scatter',
        mode: 'markers',
        marker: { color: bestChannelColor, size: 5, symbol: 'star' }, // Use a distinct color and symbol
        name: 'Location',
        showlegend: false,
      },
      // Background representing the probe

    ];

    // Highlighting the active area across Y coordinates of active channels
    activeIndices.forEach((channelIndex, i) => {
        plotData.push({
          x: [minX, maxX],
          y: [yCoordinates[channelIndex], yCoordinates[channelIndex]],
          type: 'scatter',
          mode: 'markers',
          marker: { color: activeChannelsColor, size: 5, symbol:"circle" }, // Highlighting the active area
          showlegend: false,
        });
    });

    const plotLayout = {
      title: 'Location in Probe',
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#f0f0f0', // A solid color for the plot background if needed
      font: plotFont,
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        showline: false,
      },
      yaxis: {
        title: 'Depth (um)',
        showgrid: false,
        zeroline: false,
        range: [minY, maxY],
      },
      shapes: [
        // Adding a line for y_location
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          y0: y_location,
          x1: 1,
          y1: y_location,
          line: {
            color: bestChannelColor,
            width: 4,
            
          },
        }
      ],
    };
    
    Plot.newPlot('probePlotDiv', plotData, plotLayout, {displayModeBar: false});
  }, [xCoordinates, yCoordinates, x_location, y_location, activeIndices]);

  return (
    <div id="probePlotDiv" style={{ width: "100%", height: "400px" }}></div>
  );
}

function SingleTemplatePlot({ template_index, templateArray, samplingFrequency}) {


  useEffect(() => {
    const loadPlotData = async () => {
      if (!templateArray) return; // Exit early if templateArray is not available
  
      try {
        const singleTemplate = await templateArray.get([template_index, null, null]);
        const peak_to_peak_values = calculatePeakToPeakValues(singleTemplate);
        const bestChannel = peak_to_peak_values.indexOf(Math.max(...peak_to_peak_values));
        const bestChannelPeakToPeak = peak_to_peak_values[bestChannel];
        const singleTemplateBestChannel = singleTemplate.get([null, bestChannel]);
        
        const numberOfSamples = await singleTemplate.shape[0];
        const xData = Array.from({ length: numberOfSamples }, (_, i) => i);
        const timeMilliseconds = xData.map((value) => value / samplingFrequency * 1000.0);
        

        
        // Initialize an array to hold plot data for all channels
        let plotData = [];
        
        plotData.push({
          x: timeMilliseconds,
          y: singleTemplateBestChannel.data,
          type: 'scatter',
          mode: 'lines',
          line: {
            color: bestChannelColor,
            width: 5,
            opacity: 1,
          },
          name: "Best Channel",
          showlegend: true,
        }
        )

        const numberOfChannels = await singleTemplate.shape[1];
        let firstChannelFound = true;
    
        for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
          const channelData = await singleTemplate.get([null, channelIndex]);
          const yData = channelData.data;
          const channelPeakToPeak = peak_to_peak_values[channelIndex]
          if (channelPeakToPeak >= bestChannelPeakToPeak * percentageToFilterChannels) {
            if (channelIndex === bestChannel) {
              continue;
            }
            
            plotData.push({
              x: timeMilliseconds,
              y: yData,
              type: 'scatter',
              mode: 'lines',
              line: {
                color: activeChannelsColor,
                width: 0.5,
                opacity: 0.01,
              },
              name: `Active Channels`,
              legendgroup: 'Active Channels',
              showlegend: firstChannelFound, 
              visible: "legendonly", 
            });
            firstChannelFound = false;
          }
        }

        const plotLayout = {
          title: `Template Index: ${template_index}`,
          autosize: true,
          font: plotFont, 
          xaxis: { title: 'Time (ms)', showgrid: false},
          yaxis: { title: 'Amplitude (uV)', showgrid: false},
          legend: {
            x: 0.1, 
            y: 0.1, 
            xanchor: 'left', 
            yanchor: 'bottom' 
          }
        };

        Plot.newPlot('plotDiv', plotData, plotLayout, {displayModeBar: true});
      } catch (error) {
        console.error("Error loading plot data:", error);
      }
    };
  
    loadPlotData();
  }, [template_index, templateArray]); // Dependency array to re-run this effect when template_index or templateArray changes
  
  
  return (
    <div id="plotDiv" style={{ width: "100%", height: "400px" }}></div>
  );
}



function calculatePeakToPeakValues(single_template) {
  const numberOfChannels = single_template.shape[1];
  const peak_to_peak_values = new Array(numberOfChannels).fill(0).map((_, channelIndex) => {
    let channelMax = -Infinity;
    let channelMin = Infinity;
    single_template.data.forEach(sample => {
      const value = sample[channelIndex];
      if (value > channelMax) channelMax = value;
      if (value < channelMin) channelMin = value;
    });
    return channelMax - channelMin;
  });
  return peak_to_peak_values;
}

export default App;