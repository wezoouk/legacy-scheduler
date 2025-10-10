import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Code, Save, X } from 'lucide-react';
import { EmailTemplate } from '@/lib/email-templates';

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSave: (template: EmailTemplate) => void;
  recipientName?: string;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSave,
  recipientName = '[Recipient Name]'
}: TemplateEditorDialogProps) {
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (template) {
      setEditedTemplate({ ...template });
    }
  }, [template]);

  const handleSave = () => {
    if (editedTemplate) {
      onSave(editedTemplate);
      onOpenChange(false);
    }
  };

  const processContent = (content: string) => {
    return content
      .replace(/\[Name\]/g, recipientName)
      .replace(/\[Recipient Name\]/g, recipientName)
      .replace(/\[Your Name\]/g, 'Your Name');
  };

  if (!editedTemplate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Code className="w-5 h-5 mr-2" />
              Edit Template: {editedTemplate.name}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save & Use
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="flex items-center">
                <Code className="w-4 h-4 mr-2" />
                Edit HTML
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                Live Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 flex flex-col space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editedTemplate.subject}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                    placeholder="Enter email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={editedTemplate.name}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                    placeholder="Enter template name..."
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <Label htmlFor="content">HTML Content</Label>
                <Textarea
                  id="content"
                  value={editedTemplate.content}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, content: e.target.value })}
                  placeholder="Enter HTML content..."
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 flex flex-col mt-4">
              <div className="flex-1 border rounded-lg p-4 bg-white overflow-y-auto">
                <div className="mb-4 p-2 bg-gray-50 rounded">
                  <strong>Subject:</strong> {processContent(editedTemplate.subject)}
                </div>
                <div 
                  dangerouslySetInnerHTML={{ __html: processContent(editedTemplate.content) }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
