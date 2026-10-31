import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { faqs } from '@/lib/site';

export function FAQ() {
	return (
		<Accordion type="single" collapsible className="faq-list">
			{faqs.map((faq, index) => (
				<AccordionItem key={faq.question} value={`faq-${index}`}>
					<AccordionTrigger>{faq.question}</AccordionTrigger>
					<AccordionContent>{faq.answer}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
