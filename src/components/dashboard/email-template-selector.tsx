import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { emailTemplates, getTemplatesByCategory, type EmailTemplate } from '@/lib/email-templates';
import { Mail, Eye, Sparkles, Heart, Calendar, GraduationCap, Baby, Shield } from 'lucide-react';

interface EmailTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: EmailTemplate) => void;
}

export function EmailTemplateSelector({ open, onOpenChange, onSelectTemplate }: EmailTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Template Preview: {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Subject Line:</h4>
                <p className="text-gray-700 bg-gray-50 p-2 rounded">{previewTemplate.subject}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Email Content:</h4>
                <div 
                  className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  handleSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}>
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}