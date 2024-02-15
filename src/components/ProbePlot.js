import {
  bestChannelColor,
  activeChannelsColor,
  plotFont,
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

  const minActiveLocationY = Math.min(...activeLocationsY);
  const maxActiveLocationY = Math.max(...activeLocationsY);

  const minX = Math.min(...xCoordinates);
  const maxX = Math.max(...xCoordinates);
  const minY = Math.min(...yCoordinates);
  const maxY = Math.max(...yCoordinates);

  useEffect(() => {
    // const plotData = [
    //   // Marker for a specific location
    //   {
    //     x: [0.5],
    //     y: [y_location],
    //     type: "scatter",
    //     mode: "markers",
    //     marker: { color: bestChannelColor, size: 10, symbol: "star" }, // Use a distinct color and symbol
    //     name: "Location",
    //     showlegend: false,
    //   },
    //   // Background representing the probe
    // ];

    // // Highlighting the active area across Y coordinates of active channels
    // activeIndices.forEach(channelIndex => {
    //   const yValue = yCoordinates[channelIndex];
    //   const xValue = xCoordinates[channelIndex];
    //   console.log("yValue: ", yValue);
    //   plotData.push({
    //     x: [0.5],
    //     y: [yValue],
    //     type: "scatter",
    //     mode: "markers",
    //     marker: { color: activeChannelsColor, size: 5, symbol: "circle" }, 
    //     showlegend: false,
    //   });
    // });
    const plotData = []
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
        range: [0, 1],
      },
      yaxis: {
        title: "Depth (um)",
        showgrid: false,
        zeroline: false,
        range: [minY, maxY],
      },
      shapes: [
        // Adding a rectangle from minActiveLocationY to maxActiveLocationY
        {
          type: "rect",
          xref: "paper",
          yref: "y",
          x0: 0,
          y0: minActiveLocationY,
          x1: 1,
          y1: maxActiveLocationY,
          fillcolor: activeChannelsColor,
          line: {
            width: 0,
          },
        },
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
            width: 1,
          },
        },        
      ],
    };

    Plot.newPlot("probePlotDiv", plotData, plotLayout, {
      displayModeBar: false,
    });
  }, []);

  return <div id="probePlotDiv" style={{ width: "100%", height: "400px" }}></div>;
}

export default ProbePlot;
