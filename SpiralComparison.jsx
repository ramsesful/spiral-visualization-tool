import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const SpiralXYComparison = () => {
  // Canvas settings
  const width = 600;
  const height = 600;
  
  // State declarations
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });
  
  // Refs
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  
  // Memoized dimensions calculation
  const graphDimensions = useMemo(() => {
    if (!isFullscreen && !isMaximized) return { width, height };
    
    if (containerRef.current) {
      return {
        width: containerRef.current.clientWidth - 40,
        height: containerRef.current.clientHeight - 150,
      };
    }
    
    return { width, height };
  }, [isFullscreen, isMaximized]);
  
  const centerX = graphDimensions.width / 2;
  const centerY = graphDimensions.height / 2;
  const margin = Math.min(50, graphDimensions.width * 0.08);

  // Constants
  const graphSettings = useMemo(() => ({
    axisColor: "#333",
    gridColor: "#e0e0e0",
    archimedeanColor: "#FF5733",
    goldenColor: "#0066FF",
    maxAngleDegrees: 200,
    maxAngleRadians: (200 * Math.PI) / 180,
    steps: 600,
    goldenRatio: (1 + Math.sqrt(5)) / 2,
    startX: -40,
    startY: 0,
    archimedeanScale: 2.5,
    goldenScale: 2.5
  }), []);

  // Memoized spiral points calculation
  const { archimedeanPoints, goldenPoints, bounds } = useMemo(() => {
    const points = {
      archimedean: [],
      golden: []
    };
    
    const goldenB = Math.log(graphSettings.goldenRatio) / (2 * Math.PI);
    
    // Calculate points for both spirals
    for (let i = 0; i <= graphSettings.steps; i++) {
      if (i === 0) {
        points.archimedean.push({ x: graphSettings.startX, y: graphSettings.startY });
        points.golden.push({ x: graphSettings.startX, y: graphSettings.startY });
        continue;
      }
      
      const angle = (i / graphSettings.steps) * graphSettings.maxAngleRadians;
      
      // Archimedean spiral
      const archimedeanRadius = graphSettings.archimedeanScale * angle;
      points.archimedean.push({
        x: graphSettings.startX - archimedeanRadius * Math.sin(angle),
        y: graphSettings.startY + archimedeanRadius * Math.cos(angle)
      });
      
      // Golden spiral
      const goldenRadius = graphSettings.goldenScale * (Math.pow(Math.E, goldenB * angle) - 1);
      points.golden.push({
        x: graphSettings.startX - goldenRadius * Math.sin(angle),
        y: graphSettings.startY + goldenRadius * Math.cos(angle)
      });
    }
    
    // Calculate bounds
    const allPoints = [...points.archimedean, ...points.golden];
    const bounds = {
      minX: Math.min(...allPoints.map(p => p.x)),
      maxX: Math.max(...allPoints.map(p => p.x)),
      minY: Math.min(...allPoints.map(p => p.y)),
      maxY: Math.max(...allPoints.map(p => p.y))
    };
    
    return {
      archimedeanPoints: points.archimedean,
      goldenPoints: points.golden,
      bounds
    };
  }, [graphSettings]);

  // Memoized scale calculation
  const scale = useMemo(() => {
    const boundingWidth = bounds.maxX - bounds.minX;
    const boundingHeight = bounds.maxY - bounds.minY;
    const graphWidth = graphDimensions.width - 2 * margin;
    const graphHeight = graphDimensions.height - 2 * margin;
    const targetOccupation = 0.75;
    const scaleX = (graphWidth * targetOccupation) / boundingWidth;
    const scaleY = (graphHeight * targetOccupation) / boundingHeight;
    return Math.min(scaleX, scaleY);
  }, [bounds, graphDimensions.width, graphDimensions.height, margin]);

  // Memoized path creation
  const createPathFromPoints = useCallback((points) => {
    return points.map((point, index) => {
      const x = centerX + (point.x - (bounds.minX + bounds.maxX) / 2) * scale;
      const y = centerY - (point.y - (bounds.minY + bounds.maxY) / 2) * scale;
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  }, [centerX, centerY, bounds, scale]);

  // Memoized grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const gridStep = isFullscreen || isMaximized ? 
      Math.max(20, Math.floor(graphDimensions.width / 40)) : 
      20;
    const gridCount = Math.floor((graphDimensions.width / 2) / gridStep);
    
    // Horizontal grid lines
    for (let i = -gridCount; i <= gridCount; i++) {
      lines.push(
        <line 
          key={`h-${i}`}
          x1={margin} 
          y1={centerY + i * gridStep}
          x2={graphDimensions.width - margin} 
          y2={centerY + i * gridStep}
          stroke={graphSettings.gridColor}
          strokeWidth="1"
        />
      );
    }
    
    // Vertical grid lines
    for (let i = -gridCount; i <= gridCount; i++) {
      lines.push(
        <line 
          key={`v-${i}`}
          x1={centerX + i * gridStep} 
          y1={margin}
          x2={centerX + i * gridStep} 
          y2={graphDimensions.height - margin}
          stroke={graphSettings.gridColor}
          strokeWidth="1"
        />
      );
    }
    
    return lines;
  }, [graphDimensions, isFullscreen, isMaximized, margin, centerX, centerY, graphSettings.gridColor]);

  // Memoized degree wheel
  const degreeWheel = useMemo(() => {
    const elements = [];
    const wheelRadius = Math.min(graphDimensions.width, graphDimensions.height) * 0.45;
    const degreeStep = 10;
    const majorStep = 30;
    const svgStartX = centerX + (graphSettings.startX - (bounds.minX + bounds.maxX) / 2) * scale;
    const svgStartY = centerY - (graphSettings.startY - (bounds.minY + bounds.maxY) / 2) * scale;

    // Generate degree markings
    for (let angle = 0; angle <= graphSettings.maxAngleDegrees; angle += degreeStep) {
      const angleRad = (angle * Math.PI) / 180;
      const startAngleRad = Math.PI/2 - angleRad;
      
      const innerRadius = angle % majorStep === 0 ? wheelRadius - 15 : wheelRadius - 8;
      const outerRadius = wheelRadius;
      
      const innerX = svgStartX + innerRadius * Math.cos(startAngleRad);
      const innerY = svgStartY - innerRadius * Math.sin(startAngleRad);
      const outerX = svgStartX + outerRadius * Math.cos(startAngleRad);
      const outerY = svgStartY - outerRadius * Math.sin(startAngleRad);
      
      elements.push(
        <line
          key={`tick-${angle}`}
          x1={innerX}
          y1={innerY}
          x2={outerX}
          y2={outerY}
          stroke={angle % majorStep === 0 ? "#555" : "#999"}
          strokeWidth={angle % majorStep === 0 ? 2 : 1}
        />
      );
      
      if (angle % majorStep === 0) {
        const labelRadius = outerRadius + 15;
        const labelX = svgStartX + labelRadius * Math.cos(startAngleRad);
        const labelY = svgStartY - labelRadius * Math.sin(startAngleRad);
        
        elements.push(
          <text
            key={`label-${angle}`}
            x={labelX}
            y={labelY}
            fontSize={isFullscreen || isMaximized ? "12" : "10"}
            fill="#555"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {angle}°
          </text>
        );
      }
    }

    // Add arcs
    [60, 120, 180].forEach(segmentAngle => {
      const angleRad = (segmentAngle * Math.PI) / 180;
      const startAngleRad = Math.PI/2;
      const endAngleRad = Math.PI/2 - angleRad;
      const arcRadius = wheelRadius - 25;
      
      const arcPath = [
        `M ${svgStartX} ${svgStartY}`,
        `L ${svgStartX + arcRadius * Math.cos(startAngleRad)} ${svgStartY - arcRadius * Math.sin(startAngleRad)}`,
        `A ${arcRadius} ${arcRadius} 0 ${segmentAngle > 180 ? 1 : 0} 1 ${svgStartX + arcRadius * Math.cos(endAngleRad)} ${svgStartY - arcRadius * Math.sin(endAngleRad)}`,
        'Z'
      ].join(' ');
      
      elements.push(
        <path
          key={`arc-${segmentAngle}`}
          d={arcPath}
          fill="rgba(200, 200, 200, 0.1)"
          stroke="#ccc"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
      );
    });

    return elements;
  }, [graphDimensions, isFullscreen, isMaximized, centerX, centerY, bounds, scale, graphSettings]);

  // View calculations
  const getViewBox = useCallback(() => {
    const viewWidth = graphDimensions.width / zoom;
    const viewHeight = graphDimensions.height / zoom;
    const viewCenterX = graphDimensions.width / 2 + panOffset.x;
    const viewCenterY = graphDimensions.height / 2 + panOffset.y;
    return `${viewCenterX - viewWidth / 2} ${viewCenterY - viewHeight / 2} ${viewWidth} ${viewHeight}`;
  }, [graphDimensions.width, graphDimensions.height, zoom, panOffset]);

  // Event handlers
  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const toggleMaximized = useCallback(() => {
    setIsMaximized(prev => !prev);
    resetView();
  }, [resetView]);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  }, []);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen();
        } else if (containerRef.current?.msRequestFullscreen) {
          containerRef.current.msRequestFullscreen();
        } else {
          toggleMaximized();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      toggleMaximized();
    }
  }, [isFullscreen, toggleMaximized]);

  const handleZoom = useCallback((factor) => {
    setZoom(prev => Math.max(0.5, Math.min(10, prev * factor)));
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    
    const svgX = mouseX / svgRect.width * graphDimensions.width;
    const svgY = mouseY / svgRect.height * graphDimensions.height;
    
    const offsetX = (svgX - graphDimensions.width / 2) / zoom;
    const offsetY = (svgY - graphDimensions.height / 2) / zoom;
    
    setZoom(prev => {
      const newZoom = prev * zoomFactor;
      return Math.max(0.5, Math.min(10, newZoom));
    });
    
    setPanOffset(prev => ({
      x: prev.x - offsetX * (zoomFactor - 1),
      y: prev.y - offsetY * (zoomFactor - 1)
    }));
  }, [graphDimensions, zoom]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPanPos({
        x: e.clientX,
        y: e.clientY
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      const dx = (e.clientX - startPanPos.x) / zoom;
      const dy = (e.clientY - startPanPos.y) / zoom;
      
      setPanOffset(prev => ({
        x: prev.x - dx,
        y: prev.y - dy
      }));
      
      setStartPanPos({
        x: e.clientX,
        y: e.clientY
      });
    }
  }, [isPanning, startPanPos, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Effects
  useEffect(() => {
    const svgElement = svgRef.current;
    
    if (svgElement) {
      svgElement.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
    }
    
    return () => {
      if (svgElement) {
        svgElement.removeEventListener('wheel', handleWheel);
      }
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleWheel, handleMouseUp]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  // Calculate SVG coordinates for the starting point
  const svgStartX = centerX + (graphSettings.startX - (bounds.minX + bounds.maxX) / 2) * scale;
  const svgStartY = centerY - (graphSettings.startY - (bounds.minY + bounds.maxY) / 2) * scale;

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow ${
        isFullscreen || isMaximized ? 'fixed top-0 left-0 right-0 bottom-0 z-50 w-full h-screen m-0' : 'w-full'
      }`}
      style={{ transition: 'all 0.3s ease' }}
    >
      <h2 className="text-xl font-bold mb-4">Archimedean vs. Golden Spiral (Interactive)</h2>
      
      <div className="flex flex-wrap gap-3 mb-4 justify-center">
        <button 
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => handleZoom(1.2)}
        >
          Zoom In (+)
        </button>
        <button 
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => handleZoom(0.8)}
        >
          Zoom Out (-)
        </button>
        <button 
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={resetView}
        >
          Reset View
        </button>
        <button 
          className={`px-3 py-1 text-white rounded ${
            isFullscreen || isMaximized ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
          onClick={isFullscreen ? toggleFullscreen : toggleMaximized}
        >
          {isFullscreen || isMaximized ? 'Exit Fullscreen' : 'Fullscreen Mode'}
        </button>
        <div className="flex items-center">
          <span className="text-sm ml-2">Zoom: {zoom.toFixed(1)}x</span>
        </div>
      </div>
      
      <div className={`mb-6 p-4 bg-white rounded shadow-md ${
        isFullscreen || isMaximized ? 'flex-grow w-full flex justify-center items-center' : ''
      }`}>
        <svg 
          ref={svgRef}
          width={graphDimensions.width} 
          height={graphDimensions.height} 
          viewBox={getViewBox()}
          className="border border-gray-300"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {gridLines}
          
          <line 
            x1={margin} 
            y1={centerY} 
            x2={graphDimensions.width - margin} 
            y2={centerY} 
            stroke={graphSettings.axisColor} 
            strokeWidth="2" 
          />
          <line 
            x1={centerX} 
            y1={graphDimensions.height - margin} 
            x2={centerX} 
            y2={margin} 
            stroke={graphSettings.axisColor} 
            strokeWidth="2" 
          />
          
          <text 
            x={graphDimensions.width - margin + 5} 
            y={centerY - 10} 
            fontSize={isFullscreen || isMaximized ? "16" : "14"} 
            fill={graphSettings.axisColor}
          >
            X
          </text>
          <text 
            x={centerX + 10} 
            y={margin - 5} 
            fontSize={isFullscreen || isMaximized ? "16" : "14"} 
            fill={graphSettings.axisColor}
          >
            Y
          </text>
          
          {degreeWheel}
          
          <path
            d={createPathFromPoints(archimedeanPoints)}
            fill="none"
            stroke={graphSettings.archimedeanColor}
            strokeWidth={isFullscreen || isMaximized ? 3 : 2.5}
            strokeLinecap="round"
          />
          
          <path
            d={createPathFromPoints(goldenPoints)}
            fill="none"
            stroke={graphSettings.goldenColor}
            strokeWidth={isFullscreen || isMaximized ? 4 : 3.5}
            strokeLinecap="round"
          />
          
          <circle 
            cx={svgStartX} 
            cy={svgStartY} 
            r={isFullscreen || isMaximized ? 6 : 5} 
            fill="black" 
          />
          <text 
            x={svgStartX + 10} 
            y={svgStartY - 10} 
            fontSize={isFullscreen || isMaximized ? "14" : "12"} 
            fill={graphSettings.axisColor}
          >
            Start
          </text>
          
          <circle 
            cx={centerX + (archimedeanPoints[archimedeanPoints.length-1].x - (bounds.minX + bounds.maxX) / 2) * scale} 
            cy={centerY - (archimedeanPoints[archimedeanPoints.length-1].y - (bounds.minY + bounds.maxY) / 2) * scale} 
            r={isFullscreen || isMaximized ? 5 : 4} 
            fill={graphSettings.archimedeanColor} 
          />
          
          <circle 
            cx={centerX + (goldenPoints[goldenPoints.length-1].x - (bounds.minX + bounds.maxX) / 2) * scale} 
            cy={centerY - (goldenPoints[goldenPoints.length-1].y - (bounds.minY + bounds.maxY) / 2) * scale} 
            r={isFullscreen || isMaximized ? 5 : 4} 
            fill={graphSettings.goldenColor} 
          />
        </svg>
      </div>
      
      <div className={`flex flex-row gap-8 mb-4 flex-wrap justify-center ${
        isFullscreen || isMaximized ? 'text-lg' : ''
      }`}>
        <div className="flex items-center">
          <div 
            className="w-6 h-4 mr-2" 
            style={{ backgroundColor: graphSettings.archimedeanColor }}
          ></div>
          <span className="font-medium">Archimedean Spiral: r = a·θ</span>
        </div>
        <div className="flex items-center">
          <div 
            className="w-6 h-4 mr-2" 
            style={{ backgroundColor: graphSettings.goldenColor }}
          ></div>
          <span className="font-medium">Golden Spiral: r = a·e^(bθ) where b = ln(φ)/(2π)</span>
        </div>
      </div>
      
      <div className={`mt-2 ${
        isFullscreen || isMaximized ? 'text-base max-w-4xl text-center' : 'text-sm'
      } text-gray-700`}>
        <p><strong>Interactive Controls:</strong></p>
        <p>• Use mouse wheel or zoom buttons to zoom in/out</p>
        <p>• Click and drag to pan around the graph</p>
        <p>• Toggle fullscreen mode for optimal viewing on your ultra-wide screen</p>
        <p>• Press "Reset View" to return to the original view</p>
      </div>
    </div>
  );
};

export default SpiralXYComparison; 