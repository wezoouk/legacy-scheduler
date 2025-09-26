import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecipients } from "@/lib/use-recipients";
import { Users, Plus, Mail, Clock, CheckCircle, Edit, Trash2, X, RefreshCw, Phone } from "lucide-react";
import { format } from "date-fns";

const recipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
});

type RecipientForm = z.infer<typeof recipientSchema>;

export function RecipientList() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<any>(null);
  const { recipients, createRecipient, updateRecipient, deleteRecipient, refreshRecipients, isLoading } = useRecipients();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecipientForm>({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      timezone: 'Europe/London',
    },
  });

  const onSubmit = async (data: RecipientForm) => {
    try {
      if (editingRecipient) {
        updateRecipient(editingRecipient.id, {
          ...data,
          verified: editingRecipient.verified,
        });
        setEditingRecipient(null);
      } else {
        createRecipient({
          ...data,
          verified: false,
        });
        setShowAddForm(false);
      }
      reset();
    } catch (err) {
      console.error('Failed to save recipient:', err);
    }
  };

  const handleEdit = (recipient: any) => {
    setEditingRecipient(recipient);
    setShowAddForm(true);
    // Pre-fill form with recipient data
    reset({
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone || '',
      timezone: recipient.timezone,
    });
  };

  const handleCancel = () => {
    setEditingRecipient(null);
    setShowAddForm(false);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipients ({recipients.length})</h2>
          <p className="text-muted-foreground">
            Manage your contact list for message delivery
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshRecipients} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
        </div>
      </div>

      {/* Add Recipient Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingRecipient ? 'Edit Recipient' : 'Add New Recipient'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 555 123 4567"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="e.g., Europe/London, America/New_York"
                    {...register("timezone")}
                  />
                  {errors.timezone && (
                    <p className="text-sm text-destructive">{errors.timezone.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingRecipient ? 'Update Recipient' : 'Add Recipient'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recipients List */}
      {recipients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Recipients</CardTitle>
            <CardDescription>
              Add contacts to send your scheduled messages to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No recipients yet</p>
              <p>Add your first recipient to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipients.map((recipient) => (
            <Card key={recipient.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{recipient.name}</h3>
                      <div className="flex items-center space-x-1 text-sm">
                        <Mail className="h-3 w-3" />
                        <span className="text-muted-foreground">{recipient.email}</span>
                      </div>
                      {recipient.phone && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Phone className="h-3 w-3" />
                          <span className="text-muted-foreground">{recipient.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(recipient)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecipient(recipient.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    {recipient.verified ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                    <span>{recipient.verified ? 'Verified' : 'Pending verification'}</span>
                  </div>
                  
                  <div>
                    <strong>Timezone:</strong> {recipient.timezone}
                  </div>
                  
                  <div>
                    <strong>Added:</strong> {format(recipient.createdAt, 'PP')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}