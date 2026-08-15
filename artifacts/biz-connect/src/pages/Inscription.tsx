import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateLead } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
  phone: z.string().min(8, "Veuillez entrer un numéro de téléphone valide"),
  city: z.string().min(2, "Veuillez entrer votre ville"),
});

export default function Inscription() {
  const [isSuccess, setIsSuccess] = useState(false);
  const createLead = useCreateLead();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      city: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createLead.mutate({ data: values }, {
      onSuccess: () => {
        setIsSuccess(true);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border shadow-xl rounded-2xl p-8 relative z-10"
          >
            {isSuccess ? (
              <div className="text-center py-8">
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-4">Inscription réussie !</h2>
                <p className="text-muted-foreground mb-8">
                  Vos informations ont été enregistrées. Un membre de notre équipe vous contactera très prochainement.
                </p>
                <Link href="/" className="inline-flex items-center justify-center w-full px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/90 transition-colors">
                  Retour au site
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-extrabold mb-2">Rejoindre l'élite</h1>
                  <p className="text-muted-foreground">Remplissez ce formulaire pour accéder au réseau.</p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet</FormLabel>
                          <FormControl>
                            <Input placeholder="Jean Dupont" className="bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="+225 00 00 00 00" className="bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville & Pays</FormLabel>
                          <FormControl>
                            <Input placeholder="Abidjan, CI" className="bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg font-bold" 
                      disabled={createLead.isPending}
                    >
                      {createLead.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> En cours...
                        </>
                      ) : (
                        "Valider mon inscription"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}