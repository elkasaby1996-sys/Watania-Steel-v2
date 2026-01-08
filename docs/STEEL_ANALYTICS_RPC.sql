create or replace function public.steel_analytics_summary(
  start_date date,
  end_date date,
  mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  result jsonb;
begin
  select role
    into v_role
    from public.profiles
   where id = auth.uid();

  if v_role is null or v_role not in ('admin', 'editor', 'viewer') then
    raise exception 'not authorized';
  end if;

  with combined as (
    select
      date,
      order_type,
      tons,
      breakdown_8mm,
      breakdown_10mm,
      breakdown_12mm,
      breakdown_14mm,
      breakdown_16mm,
      breakdown_18mm,
      breakdown_20mm,
      breakdown_25mm,
      breakdown_32mm
    from public.orders
    union all
    select
      date,
      order_type,
      tons,
      breakdown_8mm,
      breakdown_10mm,
      breakdown_12mm,
      breakdown_14mm,
      breakdown_16mm,
      breakdown_18mm,
      breakdown_20mm,
      breakdown_25mm,
      breakdown_32mm
    from public.history_orders
  ),
  filtered as (
    select *
      from combined
     where date between start_date and end_date
       and (mode = 'all' or order_type = mode)
  ),
  daily as (
    select
      date,
      coalesce(sum(tons), 0) as tons
    from filtered
    group by date
  ),
  breakdown as (
    select
      coalesce(sum(breakdown_8mm), 0) as breakdown_8mm,
      coalesce(sum(breakdown_10mm), 0) as breakdown_10mm,
      coalesce(sum(breakdown_12mm), 0) as breakdown_12mm,
      coalesce(sum(breakdown_14mm), 0) as breakdown_14mm,
      coalesce(sum(breakdown_16mm), 0) as breakdown_16mm,
      coalesce(sum(breakdown_18mm), 0) as breakdown_18mm,
      coalesce(sum(breakdown_20mm), 0) as breakdown_20mm,
      coalesce(sum(breakdown_25mm), 0) as breakdown_25mm,
      coalesce(sum(breakdown_32mm), 0) as breakdown_32mm
    from filtered
  ),
  totals as (
    select
      count(*) as rows_analyzed,
      count(distinct date) as active_days,
      coalesce(sum(tons), 0) as total_tons
    from filtered
  ),
  breakdown_total as (
    select
      breakdown_8mm
      + breakdown_10mm
      + breakdown_12mm
      + breakdown_14mm
      + breakdown_16mm
      + breakdown_18mm
      + breakdown_20mm
      + breakdown_25mm
      + breakdown_32mm as total_breakdown
    from breakdown
  )
  select jsonb_build_object(
    'rows_analyzed', totals.rows_analyzed,
    'active_days', totals.active_days,
    'total_tons', totals.total_tons,
    'daily_average', case
      when totals.active_days > 0 then totals.total_tons / totals.active_days
      else 0
    end,
    'time_series', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('date', date, 'tons', tons)
          order by date
        )
        from daily
      ),
      '[]'::jsonb
    ),
    'diameter_totals', to_jsonb(
      array_remove(
        array[
          jsonb_build_object('label', '8mm', 'tons', breakdown.breakdown_8mm),
          jsonb_build_object('label', '10mm', 'tons', breakdown.breakdown_10mm),
          jsonb_build_object('label', '12mm', 'tons', breakdown.breakdown_12mm),
          jsonb_build_object('label', '14mm', 'tons', breakdown.breakdown_14mm),
          jsonb_build_object('label', '16mm', 'tons', breakdown.breakdown_16mm),
          jsonb_build_object('label', '18mm', 'tons', breakdown.breakdown_18mm),
          jsonb_build_object('label', '20mm', 'tons', breakdown.breakdown_20mm),
          jsonb_build_object('label', '25mm', 'tons', breakdown.breakdown_25mm),
          jsonb_build_object('label', '32mm', 'tons', breakdown.breakdown_32mm),
          case
            when totals.total_tons > breakdown_total.total_breakdown
              then jsonb_build_object(
                'label',
                'Other',
                'tons',
                totals.total_tons - breakdown_total.total_breakdown
              )
            else null
          end
        ],
        null
      )
    )
  )
  into result
  from totals, breakdown, breakdown_total;

  return result;
end;
$$;

revoke all on function public.steel_analytics_summary(date, date, text) from public;
grant execute on function public.steel_analytics_summary(date, date, text) to authenticated;
