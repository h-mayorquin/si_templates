import {
  bestChannelColor,
  activeChannelsColor,
  plotFont,
  percentageToFilterChannels,
  gi,
} from "../styles/StyleConstants"; // Adjusted to match the file name case
import React, { useEffect } from "react";
import Plot from "plotly.js-dist";

function ProbePlot({ xCoordinates, yCoordinates, location, activeIndices }) {
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
        type: "scatter",
        mode: "markers",
        marker: { color: bestChannelColor, size: 5, symbol: "star" }, // Use a distinct color and symbol
        name: "Location",
        showlegend: false,
      },
      // Background representing the probe
    ];

    // Highlighting the active area across Y coordinates of active channels
    activeIndices.forEach((channelIndex, i) => {
      plotData.push({
        x: [minX, maxX],
        y: [yCoordinates[channelIndex], yCoordinates[channelIndex]],
        type: "scatter",
        mode: "markers",
        marker: { color: activeChannelsColor, size: 5, symbol: "circle" }, // Highlighting the active area
        showlegend: false,
      });
    });

    const plotLayout = {
      title: "Location in Probe",
      autosize: true,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#f0f0f0", // A solid color for the plot background if needed
      font: plotFont,
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        showline: false,
      },
      yaxis: {
        title: "Depth (um)",
        showgrid: false,
        zeroline: false,
        range: [minY, maxY],
      },
      shapes: [
        // Adding a line for y_location
        {
          type: "line",
          xref: "paper",
          x0: 0,
          y0: y_location,
          x1: 1,
          y1: y_location,
          line: {
            color: bestChannelColor,
            width: 4,
          },
        },
      ],
    };

    Plot.newPlot("probePlotDiv", plotData, plotLayout, {
      displayModeBar: false,
    });
  }, [xCoordinates, yCoordinates, x_location, y_location, activeIndices]);

  return <div id="probePlotDiv" style={{ width: "100%", height: "400px" }}></div>;
}

export default ProbePlot;
