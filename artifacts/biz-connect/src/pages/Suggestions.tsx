import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Send, CheckCircle2, User, Globe2, MessageSquare, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

import { useGetContent, useCreateSuggestion } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  country: z.string().min(2, "Le pays doit contenir au moins 2 caractères"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères").max(5000, "Le message est trop long"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Suggestions() {
  const { data: content, isLoading: isContentLoading } = useGetContent();
  const createSuggestion = useCreateSuggestion();

  const [showForm, setShowForm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      country: '',
      message: '',
    },
  });

  if (isContentLoading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const introText = content.suggestionsIntroText || "Aidez-nous à améliorer la communauté en partageant vos idées et suggestions.";

  const onSubmit = (values: FormValues) => {
    setSubmitError(null);
    createSuggestion.mutate(
      { data: values },
      {
        onSuccess: () => {
          setIsSuccess(true);
          form.reset();
        },
        onError: () => {
          setSubmitError("Une erreur est survenue lors de l'envoi de votre suggestion. Veuillez réessayer.");
        }
      }
    );
  };

  const resetForm = () => {
    setIsSuccess(false);
    setShowForm(false);
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      
      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 font-medium">
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>

          <div className="bg-card rounded-3xl p-8 sm:p-10 shadow-sm border border-border relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-50 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-blue-500/20">
                <Lightbulb size={32} strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl font-black mb-4 tracking-tight text-foreground">
                Boîte à suggestions
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto text-base">
                {introText}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!showForm && !isSuccess && (
                <motion.div
                  key="initial-button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5"
                  >
                    <Lightbulb size={20} />
                    Je suggère ceci
                  </button>
                </motion.div>
              )}

              {showForm && !isSuccess && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 border-t border-border">
                    {submitError && (
                      <div className="mb-6 p-4 bg-red-500/10 text-red-600 rounded-xl flex items-start gap-3 border border-red-500/20">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div className="text-sm font-medium">{submitError}</div>
                      </div>
                    )}

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
                        <div className="grid sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                                  <User size={16} className="text-blue-500" />
                                  Votre nom
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Comment vous appelez-vous ?" 
                                    {...field} 
                                    className="h-12 rounded-xl bg-background border-border focus-visible:ring-blue-500 text-base" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                                  <Globe2 size={16} className="text-green-500" />
                                  Votre pays
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="D'où venez-vous ?" 
                                    {...field} 
                                    className="h-12 rounded-xl bg-background border-border focus-visible:ring-green-500 text-base" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                                <MessageSquare size={16} className="text-amber-500" />
                                Votre suggestion
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Partagez vos idées ou suggestions pour améliorer la communauté..." 
                                  className="min-h-[160px] resize-y rounded-xl bg-background border-border focus-visible:ring-amber-500 text-base p-4" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center justify-end gap-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            disabled={createSuggestion.isPending}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {createSuggestion.isPending ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                Envoi en cours...
                              </>
                            ) : (
                              <>
                                <Send size={18} />
                                Envoyer
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </Form>
                  </div>
                </motion.div>
              )}

              {isSuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring", bounce: 0.5 }}
                  className="pt-6 border-t border-border flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Merci pour votre suggestion !</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm">
                    Votre message a bien été envoyé. Nous l'étudierons avec attention pour améliorer Biz Connect Academy.
                  </p>
                  <button
                    onClick={resetForm}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Lightbulb size={16} />
                    Soumettre une autre idée
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
