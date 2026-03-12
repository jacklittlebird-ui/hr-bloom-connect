-- Fix loan installments generation trigger: keep only one AFTER INSERT trigger
DROP TRIGGER IF EXISTS trg_generate_loan_installments ON public.loans;
DROP TRIGGER IF EXISTS trg_generate_installments ON public.loans;

CREATE TRIGGER trg_generate_installments
AFTER INSERT ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.generate_loan_installments();