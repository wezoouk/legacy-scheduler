import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { emailTemplates, getTemplatesByCategory, type EmailTemplate } from '@/lib/email-templates';
import { Mail, Eye, Sparkles, Heart, Calendar, GraduationCap, Baby, Shield, Palette } from 'lucide-react';

interface EmailTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: EmailTemplate, backgroundColor?: string) => void;
}

export function EmailTemplateSelector({ open, onOpenChange, onSelectTemplate }: EmailTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>('#f8f9fa');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const templatesByCategory = getTemplatesByCategory();
  const categories = Object.keys(templatesByCategory);
  
  const filteredTemplates = selectedCategory === 'all' 
    ? emailTemplates 
    : emailTemplates.filter(t => t.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'birthday': return <Calendar className="w-4 h-4" />;
      case 'christmas': return <Sparkles className="w-4 h-4" />;
      case 'anniversary': return <Heart className="w-4 h-4" />;
      case 'achievement': return <GraduationCap className="w-4 h-4" />;
      case 'new baby': return <Baby className="w-4 h-4" />;
      case 'legacy': return <Shield className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'birthday': return 'bg-pink-100 text-pink-800';
      case 'christmas': return 'bg-green-100 text-green-800';
      case 'anniversary': return 'bg-rose-100 text-rose-800';
      case 'achievement': return 'bg-blue-100 text-blue-800';
      case 'new baby': return 'bg-yellow-100 text-yellow-800';
      case 'legacy': return 'bg-purple-100 text-purple-800';
      case 'gratitude': return 'bg-orange-100 text-orange-800';
      case 'encouragement': return 'bg-cyan-100 text-cyan-800';
      case 'farewell': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Choose Email Template
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex h-[600px]">
            {/* Category Sidebar */}
            <div className="w-48 border-r pr-4 overflow-y-auto">
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('all')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  All Templates
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {getCategoryIcon(category)}
                    <span className="ml-2">{category}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 pl-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge className={getCategoryColor(template.category)}>
                          {getCategoryIcon(template.category)}
                          <span className="ml-1">{template.category}</span>
                        </Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Subject:</p>
                          <p className="text-sm text-gray-600">{template.subject}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Preview:</p>
                          <p className="text-xs text-gray-500">{template.preview}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => setPreviewTemplate(template)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSelectTemplate(template)}
                            className="flex-1"
                          >
                            Use Template
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found in this category</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Template Preview: {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
              {/* Background Color Control */}
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">Background Color:</span>
                </div>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => {
                    console.log('Background color changed to:', e.target.value);
                    setBackgroundColor(e.target.value);
                  }}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <span className="text-xs text-gray-600 font-mono">{backgroundColor}</span>
                <div className="text-xs text-gray-500">Debug: {backgroundColor}</div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto">
                {/* Left side - Preview */}
                <div className="flex flex-col space-y-2 min-h-0">
                  <h4 className="font-semibold">Live Preview:</h4>
                  <div className="flex-1 border rounded-lg bg-gray-50 overflow-y-auto p-4 min-h-0">
                    <style>{`
                      .template-preview {
                        color: #000000;
                      }
                      .template-preview p,
                      .template-preview div,
                      .template-preview span,
                      .template-preview td {
                        color: #000000;
                      }
                      /* Allow user-selected colors to override default black */
                      .template-preview .ql-color-red,
                      .template-preview .ql-color-orange,
                      .template-preview .ql-color-yellow,
                      .template-preview .ql-color-green,
                      .template-preview .ql-color-blue,
                      .template-preview .ql-color-purple,
                      .template-preview .ql-color-white,
                      .template-preview .ql-color-black {
                        color: inherit !important;
                      }
                      .template-preview .ql-align-center {
                        text-align: center !important;
                      }
                      .template-preview .ql-align-right {
                        text-align: right !important;
                      }
                      .template-preview .ql-align-justify {
                        text-align: justify !important;
                      }
                      .template-preview .ql-align-left {
                        text-align: left !important;
                      }
                      .template-preview .ql-size-small {
                        font-size: 0.75em !important;
                      }
                      .template-preview .ql-size-large {
                        font-size: 1.5em !important;
                      }
                      .template-preview .ql-size-huge {
                        font-size: 2.5em !important;
                      }
                      .template-preview h1 {
                        font-size: 2em !important;
                        font-weight: bold !important;
                      }
                      .template-preview h2 {
                        font-size: 1.5em !important;
                        font-weight: bold !important;
                      }
                      .template-preview h3 {
                        font-size: 1.17em !important;
                        font-weight: bold !important;
                      }
                      .template-preview strong,
                      .template-preview b {
                        font-weight: bold !important;
                      }
                      .template-preview em,
                      .template-preview i {
                        font-style: italic !important;
                      }
                      .template-preview u {
                        text-decoration: underline !important;
                      }
                      .template-preview s {
                        text-decoration: line-through !important;
                      }
                      .template-preview {
                        background-color: ${backgroundColor} !important;
                      }
                      .template-preview .ql-color-white {
                        color: white !important;
                      }
                      .template-preview .ql-color-red {
                        color: #e60000 !important;
                      }
                      .template-preview .ql-color-orange {
                        color: #f90 !important;
                      }
                      .template-preview .ql-color-yellow {
                        color: #ff0 !important;
                      }
                      .template-preview .ql-color-green {
                        color: #008a00 !important;
                      }
                      .template-preview .ql-color-blue {
                        color: #06c !important;
                      }
                      .template-preview .ql-color-purple {
                        color: #93f !important;
                      }
                      .template-preview .ql-color-black {
                        color: #000 !important;
                      }
                      .template-preview .ql-bg-white {
                        background-color: white !important;
                      }
                      .template-preview .ql-bg-red {
                        background-color: #e60000 !important;
                      }
                      .template-preview .ql-bg-orange {
                        background-color: #f90 !important;
                      }
                      .template-preview .ql-bg-yellow {
                        background-color: #ff0 !important;
                      }
                      .template-preview .ql-bg-green {
                        background-color: #008a00 !important;
                      }
                      .template-preview .ql-bg-blue {
                        background-color: #06c !important;
                      }
                      .template-preview .ql-bg-purple {
                        background-color: #93f !important;
                      }
                      .template-preview .ql-bg-black {
                        background-color: #000 !important;
                      }
                      .template-preview img {
                        max-width: 100% !important;
                        height: auto !important;
                        max-height: 300px !important;
                        object-fit: contain !important;
                        cursor: pointer !important;
                      }
                      .template-preview .ql-align-center img {
                        display: block !important;
                        margin: 0 auto !important;
                      }
                      .template-preview .ql-align-right img {
                        display: block !important;
                        margin-left: auto !important;
                        margin-right: 0 !important;
                      }
                      .template-preview .ql-align-left img {
                        display: block !important;
                        margin-right: auto !important;
                        margin-left: 0 !important;
                      }
                      .template-preview {
                        overflow-y: auto !important;
                        max-height: 100% !important;
                      }
                    `}</style>
                    <div 
                      className="template-preview min-h-full rounded-xl shadow-lg overflow-hidden"
                      style={{ 
                        backgroundColor: backgroundColor,
                        fontFamily: 'inherit'
                      }}
                    >
                      <div 
                        className="p-4"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'IMG') {
                            setEnlargedImage((target as HTMLImageElement).src);
                          }
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: previewTemplate.content.replace(
                            /style="([^"]*)"/gi,
                            (match, styles) => {
                              // Ensure color styles are preserved and visible
                              let newStyles = styles;
                              // If no color is specified but we have a background color, ensure text is readable
                              if (styles.includes('background-color') && !styles.includes('color:')) {
                                newStyles += ' color: #333333;';
                              }
                              return `style="${newStyles}"`;
                            }
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Right side - Editable Content */}
                <div className="flex flex-col space-y-2 min-h-0">
                  <h4 className="font-semibold text-gray-700">Edit Content:</h4>
                  <div className="flex-1 border rounded-lg overflow-y-auto min-h-0" style={{ backgroundColor: backgroundColor }}>
                    <div className="h-full flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto">
                        <RichTextEditor
                          value={previewTemplate.content}
                          onChange={(newContent) => {
                            setPreviewTemplate({
                              ...previewTemplate,
                              content: newContent
                            });
                          }}
                          className="h-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="text-sm text-gray-500">
                  Changes are applied to the preview in real-time
                </div>
                <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                    const templateWithBackground = {
                      ...previewTemplate,
                      content: previewTemplate.content.replace(
                        /background:\s*[^;]+;?/gi,
                        `background: ${backgroundColor};`
                      )
                    };
                    onSelectTemplate(templateWithBackground, backgroundColor);
                  setPreviewTemplate(null);
                }}>
                  Use This Template
                </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}