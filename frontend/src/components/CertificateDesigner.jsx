import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './CertificateDesigner.css';

const defaultElements = [
    { id: 'logo', type: 'image', label: 'Institution Logo', x: 50, y: 10, width: 100, height: 100 },
    { id: 'title', type: 'text', label: 'Certificate Title', x: 50, y: 25, content: 'Certificate of Completion', fontSize: 28, fontWeight: 'bold' },
    { id: 'recipient', type: 'text', label: 'Recipient Name', x: 50, y: 40, content: '[Student Name]', fontSize: 24 },
    { id: 'course', type: 'text', label: 'Course Name', x: 50, y: 52, content: '[Course Name]', fontSize: 18 },
    { id: 'date', type: 'text', label: 'Issue Date', x: 50, y: 62, content: '[Issue Date]', fontSize: 14 },
    { id: 'grade', type: 'badge', label: 'Grade Badge', x: 85, y: 15, content: '[Grade]' },
    { id: 'signature', type: 'signature', label: 'Signature', x: 50, y: 80 },
    { id: 'qr', type: 'qrcode', label: 'QR Code', x: 85, y: 75, size: 60 }
];

// 🎨 CERTIFICATE SKINS - Premium Luxury Styles
const certificateSkins = [
    {
        id: 'classic',
        name: 'Classic Elegant',
        icon: '📜',
        description: 'Timeless professional design',
        preview: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        settings: {
            backgroundColor: '#ffffff',
            borderColor: '#2c3e50',
            borderWidth: 3,
            borderStyle: 'double',
            accentColor: '#2c3e50',
            fontFamily: 'Georgia, serif',
            textColor: '#1a1a2e',
            pattern: 'none'
        }
    },
    {
        id: 'holographic-platinum',
        name: 'Holographic Platinum',
        icon: '💎',
        description: 'Futuristic premium shine',
        preview: 'linear-gradient(135deg, #e8e8e8 0%, #c4c4c4 25%, #f0f0f0 50%, #d4d4d4 75%, #e8e8e8 100%)',
        settings: {
            backgroundColor: '#f8f9fa',
            borderColor: 'transparent',
            borderWidth: 0,
            borderStyle: 'solid',
            accentColor: '#9ca3af',
            fontFamily: 'Helvetica, sans-serif',
            textColor: '#374151',
            pattern: 'holographic'
        }
    },
    {
        id: 'cosmic-neon',
        name: 'Cosmic Neon',
        icon: '🌌',
        description: 'Bold cyberpunk aesthetics',
        preview: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        settings: {
            backgroundColor: '#0f0c29',
            borderColor: '#00d4ff',
            borderWidth: 2,
            borderStyle: 'solid',
            accentColor: '#ff00ff',
            fontFamily: 'Arial, sans-serif',
            textColor: '#ffffff',
            pattern: 'cosmic'
        }
    },
    {
        id: 'institutional-gold',
        name: 'Institutional Gold',
        icon: '🏛',
        description: 'Royal academic prestige',
        preview: 'linear-gradient(135deg, #f9f3e3 0%, #e8d5a3 50%, #f5e6c8 100%)',
        settings: {
            backgroundColor: '#fefcf3',
            borderColor: '#c9a227',
            borderWidth: 4,
            borderStyle: 'double',
            accentColor: '#b8860b',
            fontFamily: 'Times New Roman, serif',
            textColor: '#4a3c1f',
            pattern: 'gold'
        }
    },
    {
        id: 'quantum-glass',
        name: 'Quantum Glass',
        icon: '⚡',
        description: 'Transparent modern tech',
        preview: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)',
        settings: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(102, 126, 234, 0.5)',
            borderWidth: 1,
            borderStyle: 'solid',
            accentColor: '#667eea',
            fontFamily: 'Helvetica, sans-serif',
            textColor: '#e2e8f0',
            pattern: 'glass'
        }
    },
    {
        id: 'royal-navy',
        name: 'Royal Navy',
        icon: '⚓',
        description: 'Distinguished maritime elegance',
        preview: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)',
        settings: {
            backgroundColor: '#1a365d',
            borderColor: '#ecc94b',
            borderWidth: 3,
            borderStyle: 'solid',
            accentColor: '#ecc94b',
            fontFamily: 'Georgia, serif',
            textColor: '#ffffff',
            pattern: 'navy'
        }
    },
    {
        id: 'emerald-luxury',
        name: 'Emerald Luxury',
        icon: '💚',
        description: 'Rich green sophistication',
        preview: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%)',
        settings: {
            backgroundColor: '#064e3b',
            borderColor: '#fcd34d',
            borderWidth: 3,
            borderStyle: 'double',
            accentColor: '#fcd34d',
            fontFamily: 'Times New Roman, serif',
            textColor: '#ecfdf5',
            pattern: 'emerald'
        }
    },
    {
        id: 'rose-gold',
        name: 'Rose Gold',
        icon: '🌸',
        description: 'Soft elegant warmth',
        preview: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
        settings: {
            backgroundColor: '#fdf2f8',
            borderColor: '#be185d',
            borderWidth: 2,
            borderStyle: 'solid',
            accentColor: '#db2777',
            fontFamily: 'Georgia, serif',
            textColor: '#831843',
            pattern: 'rose'
        }
    }
];

const CertificateDesigner = ({ onSave, institutionData }) => {
    const [elements, setElements] = useState(defaultElements);
    const [selectedElement, setSelectedElement] = useState(null);
    const [selectedSkin, setSelectedSkin] = useState(certificateSkins[0]);
    const [showSkinSelector, setShowSkinSelector] = useState(false);
    const [designSettings, setDesignSettings] = useState({
        backgroundColor: '#ffffff',
        borderColor: '#667eea',
        borderWidth: 3,
        borderStyle: 'solid',
        fontFamily: 'Georgia, serif',
        accentColor: '#667eea',
        textColor: '#1a1a2e',
        paperSize: 'landscape',
        pattern: 'none'
    });
    const [showPreview, setShowPreview] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const previewRef = useRef(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = useCallback((event) => {
        const { active, delta } = event;
        
        setElements(prev => prev.map(el => {
            if (el.id === active.id) {
                return {
                    ...el,
                    x: Math.max(0, Math.min(100, el.x + delta.x / 5)),
                    y: Math.max(0, Math.min(100, el.y + delta.y / 5))
                };
            }
            return el;
        }));
    }, []);

    const updateElement = (id, updates) => {
        setElements(prev => prev.map(el => 
            el.id === id ? { ...el, ...updates } : el
        ));
    };

    // Apply skin settings
    const applySkin = (skin) => {
        setSelectedSkin(skin);
        setDesignSettings(prev => ({
            ...prev,
            ...skin.settings
        }));
        setShowSkinSelector(false);
    };

    const handleExportAndIssue = async () => {
        try {
            if (!previewRef.current) return;
            
            setIsExporting(true);

            // 📸 Convert preview to canvas
            const canvas = await html2canvas(previewRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            // 📦 Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            // 🚀 Send to Backend (no web3 here!)
            const formData = new FormData();
            formData.append('certificate', blob, 'certificate.png');
            formData.append('studentName', 'John Doe');
            formData.append('courseName', 'Blockchain Development');
            formData.append('skinId', selectedSkin.id);

            const response = await axios.post('/api/certificates/issue', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                alert("✅ Certificate Issued Successfully!");
            }

        } catch (error) {
            console.error("Issue error:", error);
            alert("❌ Failed to issue certificate");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSave = () => {
        const template = {
            elements,
            settings: designSettings,
            skinId: selectedSkin.id,
            createdAt: new Date().toISOString()
        };
        onSave?.(template);
    };

    return (
        <div className="certificate-designer">
            {/* Toolbar */}
            <div className="designer-toolbar">
                {/* Skin Selector Section */}
                <div className="toolbar-section skin-section">
                    <h3>🎨 Certificate Skins</h3>
                    <motion.div 
                        className="current-skin"
                        onClick={() => setShowSkinSelector(!showSkinSelector)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div 
                            className="skin-preview-mini"
                            style={{ background: selectedSkin.preview }}
                        />
                        <div className="skin-info">
                            <span className="skin-icon">{selectedSkin.icon}</span>
                            <span className="skin-name">{selectedSkin.name}</span>
                        </div>
                        <span className="skin-toggle">{showSkinSelector ? '▲' : '▼'}</span>
                    </motion.div>

                    <AnimatePresence>
                        {showSkinSelector && (
                            <motion.div 
                                className="skin-selector"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                {certificateSkins.map((skin) => (
                                    <motion.div
                                        key={skin.id}
                                        className={`skin-option ${selectedSkin.id === skin.id ? 'active' : ''}`}
                                        onClick={() => applySkin(skin)}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div 
                                            className="skin-preview-box"
                                            style={{ background: skin.preview }}
                                        >
                                            <span className="skin-preview-icon">{skin.icon}</span>
                                        </div>
                                        <div className="skin-details">
                                            <span className="skin-title">{skin.name}</span>
                                            <span className="skin-desc">{skin.description}</span>
                                        </div>
                                        {selectedSkin.id === skin.id && (
                                            <motion.span 
                                                className="skin-check"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                ✓
                                            </motion.span>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="toolbar-section">
                    <h3>⚙️ Design Settings</h3>
                    <div className="setting-row">
                        <label>Background</label>
                        <input
                            type="color"
                            value={designSettings.backgroundColor}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                backgroundColor: e.target.value
                            })}
                        />
                    </div>
                    <div className="setting-row">
                        <label>Border Color</label>
                        <input
                            type="color"
                            value={designSettings.borderColor}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                borderColor: e.target.value
                            })}
                        />
                    </div>
                    <div className="setting-row">
                        <label>Accent Color</label>
                        <input
                            type="color"
                            value={designSettings.accentColor}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                accentColor: e.target.value
                            })}
                        />
                    </div>
                    <div className="setting-row">
                        <label>Text Color</label>
                        <input
                            type="color"
                            value={designSettings.textColor}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                textColor: e.target.value
                            })}
                        />
                    </div>
                    <div className="setting-row">
                        <label>Font Family</label>
                        <select
                            value={designSettings.fontFamily}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                fontFamily: e.target.value
                            })}
                        >
                            <option value="Georgia, serif">Georgia</option>
                            <option value="Times New Roman, serif">Times New Roman</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Helvetica, sans-serif">Helvetica</option>
                            <option value="Courier New, monospace">Courier New</option>
                        </select>
                    </div>
                    <div className="setting-row">
                        <label>Border Style</label>
                        <select
                            value={designSettings.borderStyle}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                borderStyle: e.target.value
                            })}
                        >
                            <option value="solid">Solid</option>
                            <option value="double">Double</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="groove">Groove</option>
                            <option value="ridge">Ridge</option>
                        </select>
                    </div>
                    <div className="setting-row">
                        <label>Border Width</label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={designSettings.borderWidth}
                            onChange={(e) => setDesignSettings({
                                ...designSettings,
                                borderWidth: parseInt(e.target.value)
                            })}
                        />
                        <span>{designSettings.borderWidth}px</span>
                    </div>
                </div>

                <div className="toolbar-section">
                    <h3>📐 Elements</h3>
                    <div className="elements-list">
                        {elements.map(el => (
                            <motion.div
                                key={el.id}
                                className={`element-item ${selectedElement === el.id ? 'selected' : ''}`}
                                onClick={() => setSelectedElement(el.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span className="element-icon">
                                    {el.type === 'text' && '📝'}
                                    {el.type === 'image' && '🖼️'}
                                    {el.type === 'badge' && '🏷️'}
                                    {el.type === 'signature' && '✍️'}
                                    {el.type === 'qrcode' && '📱'}
                                </span>
                                <span className="element-label">{el.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {selectedElement && (
                    <motion.div 
                        className="toolbar-section"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h3>⚙️ Element Settings</h3>
                        <ElementEditor
                            element={elements.find(el => el.id === selectedElement)}
                            onUpdate={(updates) => updateElement(selectedElement, updates)}
                        />
                    </motion.div>
                )}

                <div className="toolbar-actions">
                    <button className="btn-preview" onClick={() => setShowPreview(true)}>
                        👁️ Preview
                    </button>
                    <button className="btn-save" onClick={handleSave}>
                        💾 Save Template
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="designer-canvas">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <div 
                        className={`certificate-canvas skin-${selectedSkin.id}`}
                        style={{
                            backgroundColor: designSettings.backgroundColor,
                            border: `${designSettings.borderWidth}px ${designSettings.borderStyle} ${designSettings.borderColor}`,
                            fontFamily: designSettings.fontFamily,
                            color: designSettings.textColor
                        }}
                    >
                        {/* Pattern Overlays */}
                        <div className={`pattern-overlay pattern-${designSettings.pattern}`} />
                        
                        {/* Decorative Border */}
                        <div 
                            className="canvas-inner-border"
                            style={{ borderColor: designSettings.accentColor }}
                        />

                        {/* Corner Decorations */}
                        <div className="corner-decoration top-left" style={{ color: designSettings.accentColor }}>❧</div>
                        <div className="corner-decoration top-right" style={{ color: designSettings.accentColor }}>❧</div>
                        <div className="corner-decoration bottom-left" style={{ color: designSettings.accentColor }}>❧</div>
                        <div className="corner-decoration bottom-right" style={{ color: designSettings.accentColor }}>❧</div>

                        {elements.map(element => (
                            <DraggableElement
                                key={element.id}
                                element={element}
                                isSelected={selectedElement === element.id}
                                onClick={() => setSelectedElement(element.id)}
                                accentColor={designSettings.accentColor}
                                textColor={designSettings.textColor}
                            />
                        ))}
                    </div>
                </DndContext>

                {/* Skin Badge */}
                <motion.div 
                    className="skin-badge"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={selectedSkin.id}
                >
                    <span className="skin-badge-icon">{selectedSkin.icon}</span>
                    <span className="skin-badge-name">{selectedSkin.name}</span>
                </motion.div>
            </div>

            {/* Live Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div 
                        className="preview-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div 
                            className="preview-content"
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="close-preview" onClick={() => setShowPreview(false)}>
                                ✕
                            </button>
                            <div className="preview-header">
                                <h3>📄 Certificate Preview</h3>
                                <div className="preview-skin-tag">
                                    <span>{selectedSkin.icon}</span>
                                    <span>{selectedSkin.name}</span>
                                </div>
                            </div>
                            <div className="preview-certificate" ref={previewRef}>
                                <CertificatePreview
                                    elements={elements}
                                    settings={designSettings}
                                    skinId={selectedSkin.id}
                                    sampleData={{
                                        studentName: 'John Doe',
                                        courseName: 'Advanced Blockchain Development',
                                        grade: 'A+',
                                        issueDate: new Date().toLocaleDateString(),
                                        institutionName: institutionData?.name || 'CertChain University'
                                    }}
                                />
                            </div>
                            <div className="preview-actions">
                                <button 
                                    className="btn-export"
                                    onClick={handleExportAndIssue}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <>
                                            <span className="spinner"></span>
                                            Exporting...
                                        </>
                                    ) : (
                                        '🚀 Export & Issue Certificate'
                                    )}
                                </button>
                                <button className="btn-use" onClick={() => setShowPreview(false)}>
                                    ✓ Use This Design
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Draggable Element Component
const DraggableElement = ({ element, isSelected, onClick, accentColor, textColor }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
        id: element.id
    });

    const style = {
        left: `${element.x}%`,
        top: `${element.y}%`,
        transform: CSS.Transform.toString(transform),
        zIndex: isDragging ? 100 : isSelected ? 50 : 1
    };

    return (
        <motion.div
            ref={setNodeRef}
            className={`draggable-element ${element.type} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            style={style}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            {...attributes}
            {...listeners}
        >
            {element.type === 'text' && (
                <span style={{ 
                    fontSize: element.fontSize, 
                    fontWeight: element.fontWeight,
                    color: element.color || textColor || '#333'
                }}>
                    {element.content}
                </span>
            )}
            {element.type === 'image' && (
                <div className="element-placeholder image">
                    🎓
                </div>
            )}
            {element.type === 'badge' && (
                <div className="grade-badge" style={{ backgroundColor: accentColor }}>
                    {element.content}
                </div>
            )}
            {element.type === 'signature' && (
                <div className="signature-line">
                    <div className="line" style={{ borderColor: accentColor }}></div>
                    <span>Authorized Signature</span>
                </div>
            )}
            {element.type === 'qrcode' && (
                <div className="qr-placeholder" style={{ width: element.size, height: element.size }}>
                    📱
                </div>
            )}
            {isSelected && (
                <div className="resize-handles">
                    <div className="handle top-left"></div>
                    <div className="handle top-right"></div>
                    <div className="handle bottom-left"></div>
                    <div className="handle bottom-right"></div>
                </div>
            )}
        </motion.div>
    );
};

// Element Editor Component
const ElementEditor = ({ element, onUpdate }) => {
    if (!element) return null;

    return (
        <div className="element-editor">
            {element.type === 'text' && (
                <>
                    <div className="editor-row">
                        <label>Content</label>
                        <input
                            type="text"
                            value={element.content}
                            onChange={(e) => onUpdate({ content: e.target.value })}
                        />
                    </div>
                    <div className="editor-row">
                        <label>Font Size</label>
                        <input
                            type="range"
                            min="10"
                            max="48"
                            value={element.fontSize}
                            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                        />
                        <span>{element.fontSize}px</span>
                    </div>
                    <div className="editor-row">
                        <label>Bold</label>
                        <input
                            type="checkbox"
                            checked={element.fontWeight === 'bold'}
                            onChange={(e) => onUpdate({ fontWeight: e.target.checked ? 'bold' : 'normal' })}
                        />
                    </div>
                </>
            )}
            {element.type === 'qrcode' && (
                <div className="editor-row">
                    <label>Size</label>
                    <input
                        type="range"
                        min="40"
                        max="120"
                        value={element.size}
                        onChange={(e) => onUpdate({ size: parseInt(e.target.value) })}
                    />
                    <span>{element.size}px</span>
                </div>
            )}
            <div className="editor-row">
                <label>Position X</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={element.x}
                    onChange={(e) => onUpdate({ x: parseInt(e.target.value) })}
                />
                <span>{element.x}%</span>
            </div>
            <div className="editor-row">
                <label>Position Y</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={element.y}
                    onChange={(e) => onUpdate({ y: parseInt(e.target.value) })}
                />
                <span>{element.y}%</span>
            </div>
        </div>
    );
};

// Certificate Preview Component
const CertificatePreview = ({ elements, settings, skinId, sampleData }) => {
    const replaceVariables = (content) => {
        return content
            .replace('[Student Name]', sampleData.studentName)
            .replace('[Course Name]', sampleData.courseName)
            .replace('[Grade]', sampleData.grade)
            .replace('[Issue Date]', sampleData.issueDate);
    };

    return (
        <div 
            className={`certificate-final skin-${skinId}`}
            style={{
                backgroundColor: settings.backgroundColor,
                border: `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}`,
                fontFamily: settings.fontFamily,
                color: settings.textColor
            }}
        >
            {/* Pattern Overlay */}
            <div className={`pattern-overlay pattern-${settings.pattern}`} />
            
            {/* Inner Border */}
            <div className="inner-border" style={{ borderColor: settings.accentColor }} />
            
            {/* Corner Decorations */}
            <div className="corner-decoration top-left" style={{ color: settings.accentColor }}>❧</div>
            <div className="corner-decoration top-right" style={{ color: settings.accentColor }}>❧</div>
            <div className="corner-decoration bottom-left" style={{ color: settings.accentColor }}>❧</div>
            <div className="corner-decoration bottom-right" style={{ color: settings.accentColor }}>❧</div>
            
            {elements.map(el => (
                <div
                    key={el.id}
                    className={`cert-element ${el.type}`}
                    style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        fontSize: el.fontSize,
                        fontWeight: el.fontWeight,
                        color: el.color || settings.textColor
                    }}
                >
                    {el.type === 'text' && replaceVariables(el.content)}
                    {el.type === 'image' && <div className="logo-circle">🎓</div>}
                    {el.type === 'badge' && (
                        <div className="preview-badge" style={{ backgroundColor: settings.accentColor }}>
                            {sampleData.grade}
                        </div>
                    )}
                    {el.type === 'signature' && (
                        <div className="preview-signature">
                            <div className="sig-line" style={{ borderColor: settings.accentColor }}></div>
                            <span>Authorized Signature</span>
                        </div>
                    )}
                    {el.type === 'qrcode' && (
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://certchain.io/verify/sample`}
                            alt="QR Code"
                            className="preview-qr"
                        />
                    )}
                </div>
            ))}
            
            {/* Watermark */}
            <div className="certificate-watermark">CertChain Verified</div>
        </div>
    );
};

export default CertificateDesigner;