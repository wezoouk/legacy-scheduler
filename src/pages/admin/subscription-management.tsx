import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Crown, 
  Zap,
  CheckCircle,
  X
} from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: 'monthly' | 'yearly' | 'lifetime' | 'free';
  features: string[];
  limits: {
    maxMessages: number | null; // null = unlimited
    maxRecipients: number | null;
    maxAttachmentSize: number; // MB
    deadManSwitch: boolean;
    prioritySupport: boolean;
    customization: boolean;
    apiAccess: boolean;
    advancedScheduling: boolean;
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

const tierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  duration: z.enum(['monthly', 'yearly', 'lifetime', 'free']),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  limits: z.object({
    maxMessages: z.number().nullable(),
    maxRecipients: z.number().nullable(),
    maxAttachmentSize: z.number().min(1),
    deadManSwitch: z.boolean(),
    prioritySupport: z.boolean(),
    customization: z.boolean(),
    apiAccess: z.boolean(),
    advancedScheduling: z.boolean(),
  }),
  isActive: z.boolean(),
  isPopular: z.boolean(),
  sortOrder: z.number(),
});

type TierForm = z.infer<typeof tierSchema>;

const defaultTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started with legacy messaging',
    price: 0,
    duration: 'free',
    features: [
      'Up to 5 messages per month',
      'Basic email delivery',
      'Simple scheduling',
      'Community support'
    ],
    limits: {
      maxMessages: 5,
      maxRecipients: 10,
      maxAttachmentSize: 5,
      deadManSwitch: false,
      prioritySupport: false,
      customization: false,
      apiAccess: false,
      advancedScheduling: false,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    id: 'plus_monthly',
    name: 'Plus',
    description: 'Advanced features for regular users',
    price: 9.99,
    duration: 'monthly',
    features: [
      'Unlimited messages',
      'Video & voice messages',
      'Advanced scheduling',
      'Email support',
      'File attachments up to 100MB'
    ],
    limits: {
      maxMessages: null,
      maxRecipients: null,
      maxAttachmentSize: 100,
      deadManSwitch: false,
      prioritySupport: false,
      customization: false,
      apiAccess: false,
      advancedScheduling: true,
    },
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    id: 'plus_yearly',
    name: 'Plus Annual',
    description: 'Advanced features with yearly savings',
    price: 99.99,
    duration: 'yearly',
    features: [
      'Everything in Plus Monthly',
      '2 months free',
      'Priority email support'
    ],
    limits: {
      maxMessages: null,
      maxRecipients: null,
      maxAttachmentSize: 100,
      deadManSwitch: false,
      prioritySupport: true,
      customization: false,
      apiAccess: false,
      advancedScheduling: true,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 3,
  },
  {
    id: 'legacy',
    name: 'Legacy',
    description: 'Complete solution for ultimate peace of mind',
    price: 299.99,
    duration: 'yearly',
    features: [
      'Everything in Plus',
      'Dead Man\'s Switch',
      'Site customization',
      'Admin panel access',
      'API access',
      'Phone support',
      'Custom integrations'
    ],
    limits: {
      maxMessages: null,
      maxRecipients: null,
      maxAttachmentSize: 1000,
      deadManSwitch: true,
      prioritySupport: true,
      customization: true,
      apiAccess: true,
      advancedScheduling: true,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 4,
  },
];

export function SubscriptionManagement() {
  const [tiers, setTiers] = useState<PricingTier[]>(defaultTiers);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TierForm>({
    resolver: zodResolver(tierSchema),
  });

  useEffect(() => {
    // Load tiers from localStorage
    const storedTiers = localStorage.getItem('legacyScheduler_pricingTiers');
    if (storedTiers) {
      setTiers(JSON.parse(storedTiers));
    } else {
      // Save default tiers
      localStorage.setItem('legacyScheduler_pricingTiers', JSON.stringify(defaultTiers));
    }
  }, []);

  const watchedFeatures = watch('features') || [];

  const saveTiers = (updatedTiers: PricingTier[]) => {
    setTiers(updatedTiers);
    localStorage.setItem('legacyScheduler_pricingTiers', JSON.stringify(updatedTiers));
  };

  const handleEditTier = (tier: PricingTier) => {
    setEditingTier(tier);
    setIsCreating(false);
    
    // Populate form with tier data
    Object.keys(tier).forEach((key) => {
      setValue(key as keyof TierForm, tier[key as keyof PricingTier] as any);
    });
  };

  const handleCreateTier = () => {
    setIsCreating(true);
    setEditingTier(null);
    reset({
      name: '',
      description: '',
      price: 0,
      duration: 'monthly',
      features: [],
      limits: {
        maxMessages: 100,
        maxRecipients: 50,
        maxAttachmentSize: 10,
        deadManSwitch: false,
        prioritySupport: false,
        customization: false,
        apiAccess: false,
        advancedScheduling: false,
      },
      isActive: true,
      isPopular: false,
      sortOrder: tiers.length + 1,
    });
  };

  const handleDeleteTier = (tierId: string) => {
    if (confirm('Are you sure you want to delete this tier?')) {
      const updatedTiers = tiers.filter(tier => tier.id !== tierId);
      saveTiers(updatedTiers);
    }
  };

  const onSubmit = async (data: TierForm) => {
    try {
      if (isCreating) {
        const newTier: PricingTier = {
          ...data,
          id: Date.now().toString(),
        };
        saveTiers([...tiers, newTier]);
      } else if (editingTier) {
        const updatedTiers = tiers.map(tier =>
          tier.id === editingTier.id ? { ...tier, ...data } : tier
        );
        saveTiers(updatedTiers);
      }
      
      setEditingTier(null);
      setIsCreating(false);
      reset();
    } catch (err) {
      console.error('Failed to save tier:', err);
      alert('Failed to save tier');
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = watchedFeatures;
      setValue('features', [...currentFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = watchedFeatures;
    setValue('features', currentFeatures.filter((_, i) => i !== index));
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Annual';
      case 'lifetime': return 'Lifetime';
      case 'free': return 'Free';
      default: return duration;
    }
  };

  const getTierIcon = (tierName: string) => {
    const name = tierName.toLowerCase();
    if (name.includes('legacy') || name.includes('pro')) return Crown;
    if (name.includes('plus') || name.includes('premium')) return Zap;
    return CheckCircle;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-2">
            Configure pricing tiers, features, and subscription plans
          </p>
        </div>
        <Button onClick={handleCreateTier}>
          <Plus className="w-4 h-4 mr-2" />
          Create Tier
        </Button>
      </div>

      {/* Current Tiers Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((tier) => {
            const TierIcon = getTierIcon(tier.name);
            return (
              <Card key={tier.id} className={`relative ${tier.isPopular ? 'ring-2 ring-blue-500' : ''}`}>
                {tier.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TierIcon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <span>{tier.name}</span>
                    {!tier.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    {tier.price === 0 ? (
                      'Free'
                    ) : (
                      <>
                        ${tier.price}
                        <span className="text-base font-normal text-muted-foreground">
                          /{getDurationLabel(tier.duration).toLowerCase()}
                        </span>
                      </>
                    )}
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Features:</h4>
                      <ul className="space-y-1 text-sm">
                        {tier.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {tier.features.length > 3 && (
                          <li className="text-xs text-muted-foreground">
                            +{tier.features.length - 3} more features
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Messages:</span>
                        <div>{tier.limits.maxMessages ? tier.limits.maxMessages : 'Unlimited'}</div>
                      </div>
                      <div>
                        <span className="font-medium">Recipients:</span>
                        <div>{tier.limits.maxRecipients ? tier.limits.maxRecipients : 'Unlimited'}</div>
                      </div>
                      <div>
                        <span className="font-medium">File Size:</span>
                        <div>{tier.limits.maxAttachmentSize}MB</div>
                      </div>
                      <div>
                        <span className="font-medium">DMS:</span>
                        <div>{tier.limits.deadManSwitch ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTier(tier)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTier(tier.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Edit/Create Tier Form */}
      {(editingTier || isCreating) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Create New Tier' : `Edit ${editingTier?.name} Tier`}
            </CardTitle>
            <CardDescription>
              Configure pricing, features, and limitations for this subscription tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tier Name</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Plus, Premium, Legacy"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      className="pl-10"
                      {...register('price', { valueAsNumber: true })}
                      placeholder="9.99"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Billing Duration</Label>
                  <select
                    id="duration"
                    {...register('duration')}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                  {errors.duration && (
                    <p className="text-sm text-destructive">{errors.duration.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    {...register('sortOrder', { valueAsNumber: true })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Brief description of this tier..."
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3">
                <Label>Features</Label>
                <div className="flex space-x-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button type="button" onClick={addFeature} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {watchedFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Usage Limits</Label>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxMessages">Max Messages</Label>
                    <Input
                      id="maxMessages"
                      type="number"
                      {...register('limits.maxMessages', { 
                        setValueAs: (value) => value === '' || value === null ? null : Number(value)
                      })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxRecipients">Max Recipients</Label>
                    <Input
                      id="maxRecipients"
                      type="number"
                      {...register('limits.maxRecipients', { 
                        setValueAs: (value) => value === '' || value === null ? null : Number(value)
                      })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAttachmentSize">Max File Size (MB)</Label>
                    <Input
                      id="maxAttachmentSize"
                      type="number"
                      {...register('limits.maxAttachmentSize', { valueAsNumber: true })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="deadManSwitch">Dead Man's Switch</Label>
                    <Switch {...register('limits.deadManSwitch')} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="prioritySupport">Priority Support</Label>
                    <Switch {...register('limits.prioritySupport')} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="customization">Site Customization</Label>
                    <Switch {...register('limits.customization')} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="apiAccess">API Access</Label>
                    <Switch {...register('limits.apiAccess')} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="advancedScheduling">Advanced Scheduling</Label>
                    <Switch {...register('limits.advancedScheduling')} />
                  </div>
                </div>
              </div>

              {/* Tier Settings */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Tier Settings</Label>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">Active</Label>
                    <p className="text-sm text-muted-foreground">Make this tier available for purchase</p>
                  </div>
                  <Switch {...register('isActive')} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPopular">Popular</Label>
                    <p className="text-sm text-muted-foreground">Highlight this tier as most popular</p>
                  </div>
                  <Switch {...register('isPopular')} />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingTier(null);
                    setIsCreating(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Save className="w-4 h-4 mr-2 animate-spin" />}
                  {!isSubmitting && <Save className="w-4 h-4 mr-2" />}
                  {isCreating ? 'Create Tier' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}